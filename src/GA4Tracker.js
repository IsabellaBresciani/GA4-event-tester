const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const credentials = require('../credentials.json');
const params = require('./parameters.js');
const { parameters, requiredParameters } = params;

class GA4Tracker {
    constructor(spread_sheet_id, event_properties, tracker_tab, events) {
        this.execution_time = new Date().toISOString();
        this.ga4Requests = [];
        this.browser = null;
        this.page = null;
        this.spread_sheet_id = spread_sheet_id;
        this.tab = tracker_tab;
        this.initializeSheets();
        this.main_num = 1;
        this.events = events;
        this.ga4Responses = [];
        this.pendingRequests = new Map();
    }

    async initializeSheets() {
        try {
          const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
          });
    
          const authClient = await auth.getClient();
          this.sheets = google.sheets({ version: 'v4', auth: authClient });
        } catch (error) {
          console.error('Error initializing sheets:', error);
        }
      }

    async initialize() {
        this.browser = await puppeteer.launch({ headless: false });
        this.page = await this.browser.newPage();
        await this.page.setRequestInterception(true);
        this.setupNetworkListeners();
    }

    setMainUrl(main_url){
        this.main_url = main_url;
    }
    setMainNum(main_num){
        this.main_num = main_num;
    }
    setupNetworkListeners() {
        this.page.on('request', request => {
            const url = request.url();
            if (this.isGA4Request(url)) {
                this.debuggerAction(url);
            }
            request.continue();
        });
        // Aresponse listener
        this.page.on('response', async response => {
            const url = response.url();
            if (this.isGA4Request(url)) {
                try {
                    const status = response.status();
                    let responseBody = '';
                    
                    try {
                        responseBody = await response.text().catch(() => '');
                    } catch (bodyError) {
                        console.warn(`Could not get response body for ${url}: ${bodyError.message}`);
                        responseBody = '[Body unavailable]';
                    }
    
                    await this.handleGA4Response(url, status, responseBody);
                } catch (error) {
                    console.error('Error handling response:', error);
                }
            }
        });
    }

    
    // method to handle responses
    async handleGA4Response(url, status, body) {
        try {
            const requestData = this.pendingRequests.get(url);
            if (requestData) {
                const responseData = {
                    status: status || 0,
                    body: body || '[No body]',
                    timestamp: new Date().toISOString()
                };
    
                // Combine request and response data
                await this.appendToSheet(requestData, responseData);
    
                // Remove processed request
                this.pendingRequests.delete(url);
    
                // Store response for logging
                this.ga4Responses.push({
                    url,
                    status,
                    body: body || '[No body]',
                    timestamp: responseData.timestamp
                });
    
                // Log response status
                console.log(`Response Status ${status}`);
            }
        } catch (error) {
            console.error('Error handling GA4 response:', error);
        }
    }
    isGA4Request(url) {
        return url.includes('google-analytics.com/g/collect') || 
               url.includes('analytics.google.com/g/collect');
    }

    debuggerAction(url) {
        try {
            const keyValuePairs = this.getKeyAndValuePairs(url);
            const [userProperties, customUserProperties] = this.getUserAndClientProperties(keyValuePairs);
            const [eventDetails, customEventParameters] = this.getEventDetails(keyValuePairs);
            const itemDetailList = this.getItemListDetails(keyValuePairs);
            
            const warningList = [];
            const errorList = [];

            if (eventDetails.event_name === undefined) {
                errorList.push('event name is undefined');
            } else {
                if (this.events.includes(eventDetails.event_name)){

                
                const checkUserProperties = this.compareObjects(userProperties, requiredParameters.client_user);
                if (checkUserProperties !== true) {
                    errorList.push(`User properties missing required parameters:\n - ${checkUserProperties.join('\n - ')}`);
                }

                const { event_name } = eventDetails;
                const requiredParameters_eventList = Object.keys(requiredParameters.specific_events);

                if (requiredParameters_eventList.includes(event_name)) {
                    this.validateEvent(event_name, eventDetails, itemDetailList, errorList, requiredParameters);
                }
                }
            }
            if (this.events.includes(eventDetails.event_name)){
                const timestamp = new Date().toISOString();
                const requestData = { 
                    url, 
                    eventDetails, 
                    userProperties,
                    errors: errorList, 
                    warnings: warningList,
                    timestamp
                };
                
                this.pendingRequests.set(url, requestData);
                this.logResults(userProperties, customUserProperties, eventDetails, customEventParameters, itemDetailList, warningList, errorList);
            }
        } catch (error) {
            console.error('Error in debugger action:', error);
        }
    }

    getKeyAndValuePairs(url) {
        const pairs = [];
        const searchParams = new URL(url).searchParams;
        for (const [key, value] of searchParams.entries()) {
            pairs.push([key, decodeURIComponent(value)]);
        }
        return pairs;
    }

    getUserAndClientProperties(keyValuePairs) {
        const userProperties = {};
        const customUserProperties = {};
        
        keyValuePairs.forEach(([key, value]) => {
            if (key.startsWith('up.')) {
                customUserProperties[key] = value;
            } else if (key in parameters.client_user) {
                userProperties[parameters.client_user[key]] = value;
            }
        });
        
        return [userProperties, customUserProperties];
    }

    getEventDetails(keyValuePairs) {
        const eventDetails = {};
        const customEventParameters = {};
        
        keyValuePairs.forEach(([key, value]) => {
            if (key === 'en') {
                eventDetails.event_name = value;
            } else if (!key.startsWith('up.') && !key.startsWith('pr')) {
                eventDetails[key] = value;
            }
        });
        
        return [eventDetails, customEventParameters];
    }

    compareObjects(objectToCompare, standard) {
        const missingKeys = [];
        for (const key in standard) {
            if (!Object.prototype.hasOwnProperty.call(objectToCompare, key)) {
                missingKeys.push(key);
            }
        }
        return missingKeys.length > 0 ? missingKeys : true;
    }

    getItemListDetails(keyValuePairs) {
        const itemDetailList = [];
        const isProduct = /pr\d+/;
        const isCustomKey = /k\d+/;

        keyValuePairs.forEach(([key, value]) => {
            if (isProduct.test(key)) {
                const itemAsObject = {
                    itemParams: {},
                    customItemParams: {}
                };

                const parameterList = value.split('~');
                for (let parameter = 0; parameter < parameterList.length; parameter++) {
                    const parameterInItem = parameterList[parameter];
                    const parameterInItemKey = parameterInItem.substring(0, 2);
                    const parameterInItemValue = parameterInItem.substring(2);

                    if (parameterInItemKey in parameters.items) {
                        itemAsObject.itemParams[parameters.items[parameterInItemKey]] = parameterInItemValue;
                    } else if (isCustomKey.test(parameterInItemKey)) {
                        itemAsObject.customItemParams[parameterInItemValue] = parameterList[parameter + 1].substring(2);
                    }
                }
                itemDetailList.push(itemAsObject);
            }
        });
        return itemDetailList;
    }

    validateEvent(eventName, eventDetails, itemDetailList, errorList, requiredParameters) {
        const requiredParameters_perEvent = requiredParameters.specific_events[eventName];
        
        if (requiredParameters_perEvent.items && !(itemDetailList.length > 0)) {
            errorList.push(`Event ${eventName} requires items.`);
        }

        if (requiredParameters_perEvent.event_parameters) {
            const checkEventParameters = this.compareObjects(eventDetails, requiredParameters_perEvent.event_parameters);
            if (checkEventParameters !== true) {
                errorList.push(`Event parameters missing: \n - ${checkEventParameters.join('\n - ')}`);
            }
        }

        if (itemDetailList.length > 0) {
            itemDetailList.forEach((item, index) => {
                const checkItemProperties = this.compareObjects(item.itemParams, requiredParameters.item);
                if (checkItemProperties !== true && checkItemProperties.length >= 2) {
                    errorList.push(`Item #${index + 1} missing: \n - ${checkItemProperties.join('\n - ')}`);
                }
            });
        }
    }

    async logResults(userProperties, customUserProperties, eventDetails, customEventParameters, itemList, warningList, errorList) {
        console.group(`GA4 Event: ${eventDetails.event_name}`);

        if (errorList.length > 0) {
            console.group('❌ Errors');
            errorList.forEach(error => console.error(error));
            console.groupEnd();
        }

        if (warningList.length > 0) {
            console.group('⚠️ Warnings');
            warningList.forEach(warning => console.warn(warning));
            console.groupEnd();
        }

        //console.group('Event Details');
        //console.log(eventDetails);
        //console.groupEnd();

        //console.group('User Properties');
        //console.log(userProperties.page_path);
        //console.groupEnd();

        if (itemList.length > 0) {
            console.group('Items');
            itemList.forEach((item, index) => {
                console.log(`Item #${index + 1}:`, item);
            });
            console.groupEnd();
        }

        console.groupEnd();
    };

    async appendToSheet(data, responseData = null) {
        try {
            if (!this.event_properties) {
                const response = await this.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spread_sheet_id,
                    range: `${this.tab}!1:1`,
                });
                this.event_properties = response.data.values[0];
            }
    
            const headers = this.event_properties;
            if (!headers || !headers.length) {
                throw new Error('No headers found in spreadsheet');
            }
    
            const row = headers.map(header => {
                // Timestamp and page info
                if (header === 'timestamp') {
                    return new Date().toISOString();
                }
                if (header === 'page_url') {
                    return this.main_url;
                }
                if (header === 'page_num') {
                    return this.main_num;
                }
                if (header === 'execution_time') {
                    return this.execution_time;
                }
    
                // Response data
                if (header === 'response_status') {
                    return responseData?.status || 'N/A';
                }
                if (header === 'response_body') {
                    return responseData?.body || 'N/A';
                }
    
                // Request data
                if (data.eventDetails[header]) {
                    return data.eventDetails[header];
                }
    
                // Handle nested ep properties
                if (header.includes('ep.')) {
                    const props = header.split('.');
                    return data.eventDetails?.[props[1]];
                }
    
                // Handle user properties
                if (header.startsWith('user.')) {
                    const userProp = header.replace('user.', '');
                    return data.userProperties?.[userProp];
                }
    
                return header.split('.').reduce((obj, key) => 
                    obj ? obj[key] : undefined, data);
            });
    
            const response = await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spread_sheet_id,
                range: this.tab,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: [row]
                }
            });
    
            return response;
    
        } catch (error) {
            console.error('Error appending to spreadsheet:', error);
            throw error;
        }
    }

    async trackWebsite(url, duration = 30000, num=0, scroll=false) {
        try {
            console.log(`Starting GA4 tracking for ${url}`);
            await this.page.goto(url, { waitUntil: 'networkidle0' });
            this.main_url = url;
            // Simulate user interaction
            await this.simulateUserInteraction(num, scroll);
            
            // Wait for specified duration
            await new Promise(resolve => setTimeout(resolve, duration));
            
        } catch (error) {
            console.error('Error during tracking:', error);
        }
    }

    async simulateUserInteraction(num, scroll) {
        try {
            // Accept cookies - add these lines first
            console.log('Simulating user interaction')
            
            if (num==0){
                
                const cookieButton = await this.page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 5000 });
                if (cookieButton) {
                    await cookieButton.click();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if(scroll){
                // Scroll behavior
                await this.page.evaluate(() => {
                    return new Promise(resolve => {
                        let totalHeight = 0;
                        const distance = 100;
                        const timer = setInterval(() => {
                            window.scrollBy(0, distance);
                            totalHeight += distance;

                            if (totalHeight >= document.body.scrollHeight) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 100);
                    });
                });
            }
            

            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error('Error during user simulation:', error);
        }
    }

    async saveToFile(data) {
        try {
            const filename = `ga4_events_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            const filePath = path.join(__dirname, 'ga4_logs', filename);
            
            // Ensure directory exists
            await fs.mkdir(path.join(__dirname, 'ga4_logs'), { recursive: true });
            
            await fs.appendFile(filePath, JSON.stringify(data, null, 2) + '\n');
        } catch (error) {
            console.error('Error saving to file:', error);
        }
    }

    async close() {
        if (this.browser) {
  
            this.pendingRequests.forEach((requestData, url) => {
                console.warn(`Request without response:`, url);
            });
    
            console.log('Summary:');
            console.log('Total Responses:', this.ga4Responses.length);
            console.log('Success Responses:', this.ga4Responses.filter(r => r.status === 200).length);
            console.log('Failed Responses:', this.ga4Responses.filter(r => r.status !== 200).length);
            
            await this.browser.close();
        }
    }
}


module.exports = GA4Tracker;