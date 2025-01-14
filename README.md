# GA4-event-tracker
A Node.js tool for tracking and validating Google Analytics 4 (GA4) events in real-time. Built with Puppeteer for automated website interaction and event capture. Events are saved in a google spreadsheet



# installation


## 💻 Installation

# 1. Clone repository
git clone https://github.com/yourusername/ga4-event-tracker.git
cd ga4-event-tracker

# 2. Install dependencies
npm install

# 3. Setup credentials
 3.1 Create Google Cloud Project
 3.2 Enable Google Sheets API
 3.3 Create service account credentials
 3.4 Download as credentials.json
 3.5 Place in project root

# 4. Configuration
Modify the config.js file:
const config = {
  events: ['vdp_page', 'vlp_page'], # events that will be tracked
  spreadsheet_id: 'your_spreadsheet_id', # Your spreadsheet id
  tracker_tab: 'events-tracker', # Name of the tab in the spreadsheet where events are going to be saved
  config_tab: 'pages_config' # Name of the tab with pages coniguration
};

# Usage
"""
const GA4Tracker = require('./src/GA4Tracker');

async function main() {
    const tracker = new GA4Tracker(
        spreadsheetId,
        eventProperties,
        trackerTab,
        events
    );
    await tracker.initialize();
    await tracker.trackWebsite('https://example.com');
    await tracker.close();
}

"""


# Run with: node main.js

# Spreadsheet Structure

* Events Tracker Sheet Columns

*timestamp: Event timestamp
*page_url: Current page URL
*page_num: Page sequence number
*execution_time: Test execution timestamp
*event_name: GA4 event name
*response_status: HTTP response status
*response_body: Response content

# Pages Config Sheet Columns

*page: Page identifier
*url: Target URL
*duration: Wait time (ms)
*scroll: Enable scrolling (true/false)

