// FileMaker interface for AN Report
document.addEventListener('DOMContentLoaded', function() {
  const dateForm = document.getElementById('dateForm');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const userFilterInput = document.getElementById('userFilter');
  const submitBtn = document.querySelector('.submit-btn');
  const reportContent = document.getElementById('reportContent');

  // Handle form submission
  dateForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const userFilter = userFilterInput.value;
    
    // Validate that all required fields are filled
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }
    
    // Validate that a user is selected
    if (!userFilter) {
      alert('Please select a user.');
      return;
    }
    
    // Validate that start date is not after end date
    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date cannot be after end date.');
      return;
    }
    
    // Show loading state in main content
    showLoadingState();
    
    // Prepare the parameter object for FileMaker
    const parameter = {
      mode: 'dateInput',
      startDate: startDate,
      endDate: endDate,
      userFilter: userFilter
    };
    
    // Call FileMaker script
    callFileMakerScript('Manage: AN Report', parameter);
  });

  // Function to show loading state
  function showLoadingState() {
    reportContent.innerHTML = `
      <div class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p class="text-lg text-gray-600">Generating report...</p>
        <p class="text-sm text-gray-500 mt-2">Report for ${formatDate(startDateInput.value)} to ${formatDate(endDateInput.value)} (User: ${userFilterInput.value})</p>
      </div>
    `;
  }

  // Function to format date for display
  function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
      // Parse the date string and adjust for timezone issues
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) return dateString;
      
      // Use date components directly to avoid timezone shifts
      const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return dateString || '-';
    }
  }

  // Function to handle row clicks
  function handleRowClick(rowData) {
    try {
      console.log('Row clicked, calling FileMaker script with data:', rowData);
      
      // Disable button while script is running
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';
      
      // Call FileMaker script with the row data
      callFileMakerScript('Manage: AN Report', rowData);
      
      // Re-enable button immediately since we're not waiting for a response
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate Report';
      }, 500); // Short delay to give visual feedback
      
    } catch (error) {
      console.error('Error handling row click:', error);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Generate Report';
    }
  }

  // Function to handle exclude checkbox clicks
  function handleExcludeClick(excludeData) {
    try {
      console.log('Exclude checkbox clicked, calling FileMaker script with data:', excludeData);
      
      // Add or remove sale ID from excluded list
      const saleId = excludeData.sale._ID;
      if (saleId) {
        if (excludeData.excludeValue === true) {
          // Add to excluded list if not already there
          if (!window.excludedSaleIds.includes(saleId)) {
            window.excludedSaleIds.push(saleId);
          }
        } else {
          // Remove from excluded list
          window.excludedSaleIds = window.excludedSaleIds.filter(id => id !== saleId);
        }
        
        // Regenerate the report to update rows and recalculate summaries
        generateReport(window.currentSalesData, window.currentActionNoteData);
      }
      
      // Call FileMaker script with the exclude data
      callFileMakerScript('Manage: AN Report', excludeData);
      
      // Ensure button is always enabled
      submitBtn.disabled = false;
      submitBtn.textContent = 'Generate Report';
      
    } catch (error) {
      console.error('Error handling exclude click:', error);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Generate Report';
    }
  }

  // Function to call FileMaker script
  function callFileMakerScript(scriptName, parameter) {
    try {
      // Only disable submit button for full report generation to prevent multiple submissions
      if (parameter.mode === 'dateInput') {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Generating...';
      }
      
      // Convert parameter object to JSON string
      const parameterString = JSON.stringify(parameter);
      
      // Call FileMaker script using the FileMaker.PerformScript function
      // This is the standard way to call FileMaker scripts from a web viewer
      if (window.FileMaker) {
        window.FileMaker.PerformScript(scriptName, parameterString);
        
        // For row clicks or exclude clicks, we don't wait for a response, so re-enable button
        if (parameter.mode === 'view' || parameter.mode === 'exclude') {
          // Short delay to give visual feedback
          setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Generate Report';
          }, 200);
        }
      } else {
        // Fallback for development/testing - log to console
        console.log('FileMaker script call:', {
          script: scriptName,
          parameter: parameterString
        });
        
        // Simulate report generation for development without calling FileMaker script again
        setTimeout(() => {
          if (parameter.mode === 'dateInput') {
            // Simulate the sales data response directly
            fetch('./sales.json')
              .then(response => response.json())
              .then(salesData => {
                console.log('Development: Simulating sales data response...');
                window.processSalesData(salesData);
              })
              .catch(error => {
                console.error('Error loading sample data:', error);
                showSampleReport();
                submitBtn.disabled = false;
                submitBtn.textContent = 'Generate Report';
              });
          } else {
            // For other modes, just re-enable the button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Generate Report';
          }
        }, 1000);
        
        console.log('Development mode: Simulating FileMaker response...');
      }
      
    } catch (error) {
      console.error('Error calling FileMaker script:', error);
      showErrorState('An error occurred while processing your request.');
      
      // Re-enable button on error
      submitBtn.disabled = false;
      submitBtn.textContent = 'Generate Report';
    }
  }

  // Function to show error state
  function showErrorState(message) {
    reportContent.innerHTML = `
      <div class="text-center py-12">
        <div class="text-red-500 text-lg mb-4">⚠️ Error</div>
        <p class="text-gray-600">${message}</p>
      </div>
    `;
  }

  // Function to show sample report (for development)
  function showSampleReport() {
    reportContent.innerHTML = `
      <div class="space-y-6">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 class="text-lg font-semibold text-blue-800 mb-2">Report Summary</h2>
          <p class="text-blue-700">Period: ${formatDate(startDateInput.value)} to ${formatDate(endDateInput.value)}</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-gray-800">125</div>
            <div class="text-sm text-gray-600">Total Records</div>
          </div>
          <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-green-600">98</div>
            <div class="text-sm text-gray-600">Completed</div>
          </div>
          <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-orange-600">27</div>
            <div class="text-sm text-gray-600">Pending</div>
          </div>
        </div>
        
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-800">Report Data</h3>
          </div>
          <div class="p-4">
            <p class="text-gray-600 text-center py-8">
              This is where your FileMaker report content will appear.<br>
              The header controls remain accessible for date range adjustments.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // Function that FileMaker can call to update report content
  window.updateReportContent = function(htmlContent) {
    reportContent.innerHTML = htmlContent;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Generate Report';
  };

  // Initialize array to store excluded sales IDs
  window.excludedSaleIds = [];

  // Function that FileMaker calls with sales data from OData query
  window.processSalesData = function(salesDataJson) {
    try {
      // Parse the sales data if it's a string
      const salesData = typeof salesDataJson === 'string' 
        ? JSON.parse(salesDataJson) 
        : salesDataJson;

      console.log('Processing sales data:', salesData);
      
      // Reset excluded sales IDs when loading new data
      window.excludedSaleIds = [];

      // Show processing state
      reportContent.innerHTML = `
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <p class="text-lg text-gray-600">Processing sales data...</p>
          <p class="text-sm text-gray-500 mt-2">Extracting unique contacts</p>
        </div>
      `;

      // Extract unique contacts from sales data (most recent sale per contact)
      const uniqueContacts = extractUniqueContacts(salesData);
      
      // Generate batched OData URLs for ActionNote queries (10 contacts per URL)
      const actionNoteUrlBatches = generateActionNoteUrlBatches(uniqueContacts, userFilterInput.value);
      
      console.log('Unique contacts found:', uniqueContacts.length);
      console.log('Generated ActionNote URL batches:', actionNoteUrlBatches.length);
      console.log('User filter applied:', userFilterInput.value || 'None');

      // Store sales data and initialize batch tracking
      window.currentSalesData = salesData;
      window.actionNoteBatches = [];
      window.expectedBatchCount = actionNoteUrlBatches.length;
      window.receivedBatchCount = 0;

      // Call FileMaker script with simplified array of URLs
      const contactParameter = {
        mode: 'contactQuery',
        urls: actionNoteUrlBatches,
        originalStartDate: startDateInput.value,
        originalEndDate: endDateInput.value,
        userFilter: userFilterInput.value
      };

      // Check if we're in development mode (no FileMaker available)
      if (window.FileMaker) {
        callFileMakerScript('Manage: AN Report', contactParameter);
      } else {
        // In development mode, simulate ActionNote batch responses
        console.log('Development mode: Simulating ActionNote batch responses...');
        
        // Simulate each batch response with a delay
        actionNoteUrlBatches.forEach((url, index) => {
          setTimeout(() => {
            // Generate some sample data for this batch
            const sampleContactsForBatch = uniqueContacts.slice(index * 10, (index + 1) * 10);
            const sampleBatchData = {
              value: sampleContactsForBatch.map((contact) => ({
                Total: (Math.random() * 1000 + 100).toFixed(2),
                Account: contact.account,
                Account_ID: contact.accountId,
                User: contact.user,
                Date: contact.date,
                Status: 'Completed',
                Contact: contact.name,
                Related_ID: contact.saleId
              }))
            };
            
            console.log(`Simulating batch ${index + 1}/${actionNoteUrlBatches.length} for URL:`, url);
            window.addActionNoteBatch(sampleBatchData, index);
          }, 1000 + (index * 500)); // Stagger the responses
        });
      }

    } catch (error) {
      console.error('Error processing sales data:', error);
      showErrorState('Error processing sales data: ' + error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Generate Report';
    }
  };

  // Function to extract unique contacts from sales data and find their most recent sale
  function extractUniqueContacts(salesData) {
    const contactMap = new Map();

    // Handle different possible data structures
    let salesArray = [];
    
    if (salesData && salesData.value && Array.isArray(salesData.value)) {
      // OData format with value array
      salesArray = salesData.value;
    } else if (Array.isArray(salesData)) {
      // Direct array format
      salesArray = salesData;
    } else {
      console.warn('Unexpected sales data format:', salesData);
      return [];
    }

    // Find the most recent sale for each contact
    salesArray.forEach(sale => {
      if (sale.Contact && sale.Contact.trim() && sale._ID) {
        const contactName = sale.Contact.trim();
        const saleDate = new Date(sale.Date);
        
        // Check if we already have this contact
        const existingContact = contactMap.get(contactName);
        
        if (!existingContact || new Date(existingContact.date) < saleDate) {
          // This is either a new contact or a more recent sale for existing contact
          contactMap.set(contactName, {
            name: contactName,
            account: sale.Account ? sale.Account.trim() : '',
            accountId: sale.Account_ID || '',
            saleId: sale._ID,
            date: sale.Date,
            status: sale.Status || '',
            user: sale.User || '',
            description: sale.Description || ''
          });
        }
      }
    });

    // Convert map to array
    return Array.from(contactMap.values());
  }

  // Function to generate batched OData URLs for ActionNote queries
  function generateActionNoteUrlBatches(uniqueContacts, userFilter) {
    const baseUrl = "https://71.112.215.162/fmi/odata/v4/CMHECCRM_Sandbox/ActionNote";
    // Keep only essential fields that are known to work with OData
    const selectFields = "Account,User,Status,Contact,Account_ID,DocDescription,LastAction,DueDate,_ID"; 
    const batchSize = 5; // Reduced batch size for simpler URLs
    const urls = [];
    
    // User filter is now required, but let's double-check
    if (!userFilter || !userFilter.trim()) {
      console.warn('User filter is required but was not provided. Using fallback filter.');
      userFilter = uniqueContacts[0]?.user || ''; // Use the first contact's user as fallback
    }
    
    // Split contacts into smaller batches
    for (let i = 0; i < uniqueContacts.length; i += batchSize) {
      const batch = uniqueContacts.slice(i, i + batchSize);
      
      // For each contact in the batch, create a separate URL with very simple filter
      batch.forEach(contact => {
        // Properly escape single quotes by doubling them for OData
        const contactName = contact.name.replace(/'/g, "''");
        let filter = `Contact eq '${contactName}'`;
        
        // Always add user filter - no parentheses
        const userFilterValue = userFilter.trim().replace(/'/g, "''");
        filter = `${filter} and User eq '${userFilterValue}'`;
        
        // Create the URL with minimal formatting
        const url = `${baseUrl}?$filter=${filter}&$select=${selectFields}`;
        urls.push(url);
      });
    }
    
    return urls;
  }

  // Function that FileMaker calls with each ActionNote batch result
  window.addActionNoteBatch = function(actionNoteBatchDataJson, batchIndex) {
    try {
      // Parse the ActionNote batch data if it's a string
      const batchData = typeof actionNoteBatchDataJson === 'string' 
        ? JSON.parse(actionNoteBatchDataJson) 
        : actionNoteBatchDataJson;

      console.log(`Processing ActionNote batch ${batchIndex + 1}:`, batchData);

      // Store this batch data
      window.actionNoteBatches[batchIndex] = batchData;
      window.receivedBatchCount++;

      // Update progress in UI
      const progress = Math.round((window.receivedBatchCount / window.expectedBatchCount) * 100);
      reportContent.innerHTML = `
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <p class="text-lg text-gray-600">Processing ActionNote data...</p>
          <p class="text-sm text-gray-500 mt-2">Batch ${window.receivedBatchCount} of ${window.expectedBatchCount} (${progress}%)</p>
          <div class="w-64 bg-gray-200 rounded-full h-2 mx-auto mt-4">
            <div class="bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
          </div>
        </div>
      `;

      // Check if we have received all batches
      if (window.receivedBatchCount >= window.expectedBatchCount) {
        // Combine all batch results
        const combinedActionNoteData = {
          value: []
        };
        
        window.actionNoteBatches.forEach(batch => {
          if (batch && batch.value && Array.isArray(batch.value)) {
            combinedActionNoteData.value.push(...batch.value);
          }
        });

        console.log('All batches received, generating final report with', combinedActionNoteData.value.length, 'ActionNote records');
        
        // Generate the final report with combined data
        generateReport(window.currentSalesData, combinedActionNoteData);

        // Re-enable the button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate Report';

        // Clean up
        delete window.actionNoteBatches;
        delete window.expectedBatchCount;
        delete window.receivedBatchCount;
      }

    } catch (error) {
      console.error('Error processing ActionNote batch data:', error);
      showErrorState('Error processing ActionNote batch data: ' + error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Generate Report';
    }
  };

  // Function that FileMaker calls with ActionNote details after contactQuery (legacy support)
  window.processActionNoteData = function(actionNoteDataJson) {
    try {
      // Parse the ActionNote data if it's a string
      const actionNoteData = typeof actionNoteDataJson === 'string' 
        ? JSON.parse(actionNoteDataJson) 
        : actionNoteDataJson;

      console.log('Processing ActionNote data (legacy method):', actionNoteData);

      // Generate the final report with both sales and ActionNote data
      generateReport(window.currentSalesData, actionNoteData);

      // Re-enable the button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Generate Report';

    } catch (error) {
      console.error('Error processing ActionNote data:', error);
      showErrorState('Error processing ActionNote data: ' + error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Generate Report';
    }
  };

  // Keep the old function name for backward compatibility
  window.processContactData = window.processActionNoteData;

  // Function to generate the final report
  function generateReport(salesData, actionNoteData) {
    // Store current data for later regeneration
    window.currentSalesData = salesData;
    window.currentActionNoteData = actionNoteData;
    
    const salesArray = salesData && salesData.value ? salesData.value : salesData;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    // Initialize excludedSaleIds array if not already initialized
    if (!window.excludedSaleIds) {
      window.excludedSaleIds = [];
    }

    // Create ActionNote lookup map for easy access
    const actionNoteMap = {};
    let totalSaleValue = 0;
    let salesWithValue = 0;
    
    // Handle ActionNote data - expect OData format with value array
    let actionNoteArray = [];
    if (actionNoteData && actionNoteData.value && Array.isArray(actionNoteData.value)) {
      actionNoteArray = actionNoteData.value;
    } else if (Array.isArray(actionNoteData)) {
      actionNoteArray = actionNoteData;
    }
    
    // Group ActionNotes by Contact and User, keeping the one with due date closest to today
    // If there are past due dates, prioritize the furthest in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    
    actionNoteArray.forEach(note => {
      if (note.Contact && note.User) {
        const key = `${note.Contact}-${note.User}`;
        
        // Parse current note's due date
        let dueDateCurrent = null;
        if (note.DueDate) {
          try {
            dueDateCurrent = new Date(note.DueDate);
            dueDateCurrent.setHours(0, 0, 0, 0); // Normalize to start of day
            if (isNaN(dueDateCurrent.getTime())) dueDateCurrent = null;
          } catch (e) {
            console.warn('Invalid DueDate:', note.DueDate);
            dueDateCurrent = null;
          }
        }
        
        // Parse existing note's due date
        let dueDateExisting = null;
        if (actionNoteMap[key] && actionNoteMap[key].DueDate) {
          try {
            dueDateExisting = new Date(actionNoteMap[key].DueDate);
            dueDateExisting.setHours(0, 0, 0, 0); // Normalize to start of day
            if (isNaN(dueDateExisting.getTime())) dueDateExisting = null;
          } catch (e) {
            console.warn('Invalid existing DueDate:', actionNoteMap[key].DueDate);
            dueDateExisting = null;
          }
        }
        
        // Determine which ActionNote to keep based on proximity to today
        let shouldReplace = false;
        
        if (!actionNoteMap[key]) {
          // First note for this contact-user combination
          shouldReplace = true;
        } else if (!dueDateExisting && dueDateCurrent) {
          // Existing has no date, current has date - prefer the one with date
          shouldReplace = true;
        } else if (dueDateExisting && !dueDateCurrent) {
          // Existing has date, current has no date - keep existing
          shouldReplace = false;
        } else if (dueDateCurrent && dueDateExisting) {
          // Both have dates - apply closest to today logic
          const currentDiff = Math.abs(dueDateCurrent.getTime() - today.getTime());
          const existingDiff = Math.abs(dueDateExisting.getTime() - today.getTime());
          
          const currentIsPast = dueDateCurrent < today;
          const existingIsPast = dueDateExisting < today;
          
          if (currentIsPast && existingIsPast) {
            // Both are in the past - choose the one furthest in the past (smallest date)
            shouldReplace = dueDateCurrent < dueDateExisting;
          } else if (!currentIsPast && !existingIsPast) {
            // Both are in the future - choose the one closest to today
            shouldReplace = currentDiff < existingDiff;
          } else if (currentIsPast && !existingIsPast) {
            // Current is past, existing is future - prefer past (current)
            shouldReplace = true;
          } else {
            // Current is future, existing is past - prefer past (existing)
            shouldReplace = false;
          }
        } else {
          // Both have no dates - keep existing
          shouldReplace = false;
        }
        
        if (shouldReplace) {
          actionNoteMap[key] = note;
        }
      }
    });

    // Generate summary statistics
    const totalSales = salesArray.length;
    const statusCounts = {};
    const userCounts = {};
    const uniqueContacts = new Set();
    
    // Filter out excluded sales
    const filteredSalesArray = salesArray.filter(sale => !window.excludedSaleIds.includes(sale._ID));
    
    // Calculate sale totals only for non-excluded sales
    filteredSalesArray.forEach(sale => {
      // Count by status
      const status = sale.Status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      // Count by user
      const user = sale.User || 'Unknown';
      userCounts[user] = (userCounts[user] || 0) + 1;
      
      // Count unique contacts
      if (sale.Contact) {
        uniqueContacts.add(sale.Contact.trim());
      }
      
      // Add to sale totals
      if (sale.Total && !isNaN(parseFloat(sale.Total))) {
        totalSaleValue += parseFloat(sale.Total);
        salesWithValue++;
      }
    });

    const reportHtml = `
      <div class="space-y-6">
        <!-- Report Header -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 class="text-lg font-semibold text-blue-800 mb-2">AN Report Summary</h2>
          <p class="text-blue-700">Period: ${formatDate(startDate)} to ${formatDate(endDate)}</p>
          ${userFilterInput.value ? `<p class="text-blue-700">User Filter: ${userFilterInput.value}</p>` : ''}
          <p class="text-blue-600 text-sm">Generated: ${new Date().toLocaleString()}</p>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-gray-800">${filteredSalesArray.length}</div>
            <div class="text-sm text-gray-600">Total Sales</div>
            ${totalSales !== filteredSalesArray.length ? 
              `<div class="text-xs text-gray-500">(${totalSales - filteredSalesArray.length} excluded)</div>` : ''}
          </div>
          <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-green-600">${statusCounts['Paid in Full'] || 0}</div>
            <div class="text-sm text-gray-600">Paid in Full</div>
          </div>
          <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-blue-600">${statusCounts['All Sent'] || 0}</div>
            <div class="text-sm text-gray-600">All Sent</div>
          </div>
          <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-orange-600">${uniqueContacts.size}</div>
            <div class="text-sm text-gray-600">Unique Contacts</div>
          </div>
          <div class="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-purple-600">$${totalSaleValue.toLocaleString()}</div>
            <div class="text-sm text-gray-600">Sale Total</div>
          </div>
        </div>

        <!-- Status Breakdown -->
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-800">Status Breakdown</h3>
          </div>
          <div class="p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${Object.entries(statusCounts).map(([status, count]) => `
                <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span class="font-medium">${status}</span>
                  <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">${count}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Sales and Action Note Data Table -->
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-800">Sales & Action Note Details</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Name</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exclude</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doc Type</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sale Date</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Description</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale $ Total</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AN Do By Date</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AN Description</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AN Last Touch</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AN User</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${filteredSalesArray.map((sale, index) => {
                  // Match action note by both Contact and User
                  const actionNoteKey = `${sale.Contact}-${sale.User}`;
                  const actionNote = actionNoteMap[actionNoteKey];
                  
                  // Store row data globally for access by click handler
                  const rowId = `row-${index}`;
                  
                  return `
                    <tr class="hover:bg-gray-50 cursor-pointer clickable-row" data-row-id="${rowId}" data-sale-id="${sale._ID}">
                      <td class="px-3 py-3 text-sm text-gray-900">${sale.Account || 'N/A'}</td>
                      <td class="px-3 py-3 text-sm font-medium text-gray-900">${sale.Contact || 'N/A'}</td>
                      <td class="px-3 py-3 text-sm text-center">
                        <input type="checkbox" ${sale.ANExclude ? 'checked' : ''} class="h-4 w-4 text-blue-600 border-gray-300 rounded exclude-checkbox cursor-pointer" data-row-id="${rowId}" data-sale-id="${sale._ID}">
                      </td>
                      <td class="px-3 py-3 text-sm text-gray-900">Sale</td>
                      <td class="px-3 py-3 text-sm text-gray-900">${sale.Number || 'N/A'}</td>
                      <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-900">${formatDate(sale.Date)}</td>
                      <td class="px-3 py-3 text-sm text-gray-900">${sale.Description || 'N/A'}</td>
                      <td class="px-3 py-3 text-sm text-gray-900">${sale.Total ? '$' + parseFloat(sale.Total).toLocaleString() : 'N/A'}</td>
                      <td class="px-3 py-3 text-sm text-gray-900">${formatDate(actionNote?.DueDate)}</td>
                      <td class="px-3 py-3 text-sm text-gray-900">${actionNote?.DocDescription || '-'}</td>
                      <td class="px-3 py-3 text-sm text-gray-900">${formatDate(actionNote?.LastAction)}</td>
                      <td class="px-3 py-3 text-sm text-gray-900">${actionNote?.User || '-'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Sales Summary -->
        ${salesWithValue > 0 ? `
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-800">Sales Summary</h3>
            ${window.excludedSaleIds.length > 0 ? `<p class="text-sm text-gray-600">(Excludes ${window.excludedSaleIds.length} excluded sales)</p>` : ''}
          </div>
          <div class="p-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-purple-600">${salesWithValue}</div>
                <div class="text-sm text-gray-600">Sales with Values</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600">$${totalSaleValue.toLocaleString()}</div>
                <div class="text-sm text-gray-600">Total Sale Value</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">$${salesWithValue > 0 ? (totalSaleValue / salesWithValue).toLocaleString() : '0'}</div>
                <div class="text-sm text-gray-600">Average Sale Value</div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;

    reportContent.innerHTML = reportHtml;
    
    // Store row data for click handlers and add event listeners
    window.reportRowData = {};
    // Only use filtered sales array (excluding the excluded sales)
    filteredSalesArray.forEach((sale, index) => {
      const actionNoteKey = `${sale.Contact}-${sale.User}`;
      const actionNote = actionNoteMap[actionNoteKey];
      const rowId = `row-${index}`;
      
      // Store the row data
      window.reportRowData[rowId] = {
        mode: 'view',
        sale: {
          Account: sale.Account || '',
          Contact: sale.Contact || '',
          Contact_ID: sale.Contact_ID || '',
          ANExclude: sale.ANExclude || false,
          Number: sale.Number || '',
          Date: sale.Date || '',
          Description: sale.Description || '',
          Total: sale.Total || '',
          User: sale.User || '',
          _ID: sale._ID || ''
        },
        actionNote: actionNote ? {
          DueDate: actionNote.DueDate || '',
          DocDescription: actionNote.DocDescription || '',
          LastAction: actionNote.LastAction || '',
          User: actionNote.User || '',
          Account: actionNote.Account || '',
          Account_ID: actionNote.Account_ID || '',
          Status: actionNote.Status || '',
          Contact: actionNote.Contact || '',
          _ID: actionNote._ID || ''
        } : null
      };
    });
    
    // Add click event listeners to all clickable rows
    document.querySelectorAll('.clickable-row').forEach(row => {
      row.addEventListener('click', function(e) {
        // Don't trigger row click if checkbox was clicked
        if (e.target.classList.contains('exclude-checkbox')) {
          return;
        }
        
        const rowId = this.getAttribute('data-row-id');
        const rowData = window.reportRowData[rowId];
        if (rowData) {
          handleRowClick(rowData);
        }
      });
    });
    
    // Add click event listeners to all exclude checkboxes
    document.querySelectorAll('.exclude-checkbox').forEach(checkbox => {
      checkbox.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent row click from firing
        
        const rowId = this.getAttribute('data-row-id');
        const rowData = window.reportRowData[rowId];
        if (rowData) {
          // Create a copy of the row data with mode set to 'exclude'
          const excludeData = {
            ...rowData,
            mode: 'exclude',
            excludeValue: this.checked
          };
          handleExcludeClick(excludeData);
        }
      });
    });
  }

  // Default dates are now set directly in the DOMContentLoaded event handler

  // Development function to test with sample data and batched responses
  window.testWithBatchedData = function() {
    fetch('./sales.json')
      .then(response => response.json())
      .then(salesData => {
        console.log('Testing with sample sales data and batched ActionNote responses...');
        window.processSalesData(salesData);
      })
      .catch(error => {
        console.error('Error loading sample data:', error);
      });
  };
  
  // Uncomment the line below if you want to set default dates
  // setDefaultDates();
});