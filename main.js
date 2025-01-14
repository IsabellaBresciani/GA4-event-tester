const GA4Tracker = require('./src/GA4Tracker.js');
const { google } = require('googleapis');
const credentials = require('./credentials.json');
const config_page = require('./config.js');
const { config } = config_page
// Add sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

console.log(config)
SPREADSHEET_ID = config.spreadsheet_id

async function getSpreadsheetPagesConfig() {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });
  
      const authClient = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: authClient });
  
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${config.config_tab}`, // or your specific sheet name/range
      });
  
      const rows = response.data.values;
      
      // Skip header row and map data
      return rows.slice(1).map(row => ({
        page: row[0],
        url: row[1],
        duration: parseInt(row[2]),
        scroll: row[3]?.toLowerCase() === 'true'
      }));
  
    } catch (error) {
      console.error('Error fetching spreadsheet:', error);
      return [];
    }
  }
// Second function - events metadata
async function getEventsMetaData() {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });
  
      const authClient = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: authClient });
  
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range:  config.tracker_tab,// adjust sheet name if different
      });
  
      return response.data.values.slice(1);
    } catch (error) {
      console.error('Error fetching events metadata:', error);
      return [];
    }
}

async function main() {
    try {
        const event_properties = await getEventsMetaData();
        const tracker = new GA4Tracker(SPREADSHEET_ID, event_properties, config.tracker_tab, config.events);
        await tracker.initialize();
        const websites = await getSpreadsheetPagesConfig();
        
        num = 0;
        for (const site of websites) {
            tracker.setMainUrl(site.url)
            tracker.setMainNum(num+1)
            await tracker.trackWebsite(site.url, site.duration, num, site.scroll);
            await sleep(5000);
            num=num + 1;
        }

    } catch (error) {
        console.error('Error in main execution:', error);
    } finally {
        await tracker.close();
    }
}


// Execute tracking
if (require.main === module) {
    main()
        .then(() => {
            console.log('GA4 tracking completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.log('GA4 tracking finished:', error);
            process.exit(1);
        });
}

// Utility functions
function formatDateTime() {
    return new Date().toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, '');
}

function createSummaryReport(tracker) {
    return {
        timestamp: formatDateTime(),
        totalEvents: tracker.ga4Requests.length,
        eventTypes: [...new Set(tracker.ga4Requests.map(r => r.event_name))],
        errors: tracker.ga4Requests.filter(r => r.errors && r.errors.length > 0).length,
        warnings: tracker.ga4Requests.filter(r => r.warnings && r.warnings.length > 0).length
    };
}

// Export for external use
module.exports = {
    createSummaryReport
};
