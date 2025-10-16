// FileMaker interface for AN Report
document.addEventListener('DOMContentLoaded', function() {
  const dateForm = document.getElementById('dateForm');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const userFilterInput = document.getElementById('userFilter');
  const showExcludedInput = document.getElementById('showExcluded');
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

  // Handle show excluded toggle
  showExcludedInput.addEventListener('change', function() {
    // If we have current data, regenerate the report with the new filter
    if (window.currentSalesData && window.currentActionNoteData) {
      generateReport(window.currentSalesData, window.currentActionNoteData);
    }
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

  // Function to update contacts count
  function updateContactsCount() {
    const allRows = document.querySelectorAll('tbody tr[data-sale-id]');
    // Count only main rows (not description rows) that are visible
    const visibleContacts = Array.from(allRows).filter(row => {
      // Check if row is visible (not hidden)
      const isVisible = row.style.display !== 'none';
      
      // Check if this is a main row (has account info in first cell, not empty)
      const firstCell = row.querySelector('td:first-child');
      const isMainRow = firstCell && firstCell.textContent.trim() !== '';
      
      return isVisible && isMainRow;
    });
    
    const count = visibleContacts.length;
    
    // Update the table contacts count
    const tableContactsCountValue = document.getElementById('tableContactsCountValue');
    if (tableContactsCountValue) {
      tableContactsCountValue.textContent = count;
    }
  }

  // Function to format date for display
  function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
      // Parse the date string and adjust for timezone issues
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) return dateString;
      
      // Format as MM/DD/YY
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      
      return `${month}/${day}/${year}`;
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
      
      // Add or remove sale ID from excluded list for tracking purposes
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

  // Function that FileMaker can call to populate user filter dropdown
  window.populateUserFilter = function(salesDataJson) {
    try {
      const salesData = typeof salesDataJson === 'string' 
        ? JSON.parse(salesDataJson) 
        : salesDataJson;

      const salesArray = salesData && salesData.value ? salesData.value : salesData;
      
      // Extract unique UserRef values
      const uniqueUsers = new Set();
      salesArray.forEach(sale => {
        if (sale.UserRef && sale.UserRef.trim()) {
          uniqueUsers.add(sale.UserRef.trim());
        }
      });

      // Sort the users alphabetically
      const sortedUsers = Array.from(uniqueUsers).sort();

      // Clear existing options except the first one
      userFilterInput.innerHTML = '<option value="">-- Select User --</option>';

      // Add the unique users to the dropdown
      sortedUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        userFilterInput.appendChild(option);
      });

      console.log('User filter populated with', sortedUsers.length, 'users:', sortedUsers);
    } catch (error) {
      console.error('Error populating user filter:', error);
    }
  };

  // Function that FileMaker calls with sales data from OData query
  window.processSalesData = function(salesDataJson) {
    try {
      // Parse the sales data if it's a string
      const salesData = typeof salesDataJson === 'string' 
        ? JSON.parse(salesDataJson) 
        : salesDataJson;

      console.log('Processing sales data:', salesData);
      
      // Check if sales data is empty or invalid
      const salesArray = salesData && salesData.value ? salesData.value : salesData;
      if (!salesArray || !Array.isArray(salesArray) || salesArray.length === 0) {
        console.error('No sales data found or data is empty');
        showErrorState('No sales data found for the selected date range and user. Please check your criteria and try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate Report';
        return;
      }
      
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
                UserRef: contact.user,
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
            account: sale.AccountNickname ? sale.AccountNickname.trim() : '',
            accountId: sale.Account_ID || '',
            saleId: sale._ID,
            date: sale.Date,
            status: sale.Status || '',
            user: sale.UserRef || '',
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
    const baseUrl = "https://71.112.215.162/fmi/odata/v4/CMHECCRM/ActionNote";
    // Keep only essential fields that are known to work with OData
    const selectFields = "Account,UserRef,Status,Contact,Account_ID,DocDescription,DocNumber,DocType,Purpose,LastAction,DueDate,_ID"; 
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
        filter = `${filter} and UserRef eq '${userFilterValue}'`;
        
        // Add Status filter for 'New' records only
        filter = `${filter} and Status eq 'Open'`;
        
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

  // Function to remove a row from the report (called by FileMaker)
  window.removeReportRow = function(saleId) {
    try {
      console.log('Removing row with sale ID:', saleId);
      
      // Find and remove the row(s) with the matching sale ID
      const rowsToRemove = document.querySelectorAll(`[data-sale-id="${saleId}"]`);
      
      if (rowsToRemove.length > 0) {
        rowsToRemove.forEach(row => {
          row.remove();
        });
        console.log(`Removed ${rowsToRemove.length} row(s) with sale ID: ${saleId}`);
        
        // Also remove from excluded list if it exists there
        if (window.excludedSaleIds && window.excludedSaleIds.includes(saleId)) {
          window.excludedSaleIds = window.excludedSaleIds.filter(id => id !== saleId);
        }
        
        // Remove from stored row data
        if (window.reportRowData) {
          Object.keys(window.reportRowData).forEach(rowId => {
            if (window.reportRowData[rowId].sale._ID === saleId) {
              delete window.reportRowData[rowId];
            }
          });
        }
      } else {
        console.warn('No rows found with sale ID:', saleId);
      }
      
    } catch (error) {
      console.error('Error removing row:', error);
    }
  };

  // Function to generate the final report
  function generateReport(salesData, actionNoteData) {
    // Store current data for later regeneration
    window.currentSalesData = salesData;
    window.currentActionNoteData = actionNoteData;
    
    const salesArray = salesData && salesData.value ? salesData.value : salesData;

    // Initialize excludedSaleIds array if not already initialized
    if (!window.excludedSaleIds) {
      window.excludedSaleIds = [];
    }

    // Create ActionNote lookup map for easy access
    const actionNoteMap = {};
    
    // Handle ActionNote data - expect OData format with value array
    let actionNoteArray = [];
    if (actionNoteData && actionNoteData.value && Array.isArray(actionNoteData.value)) {
      actionNoteArray = actionNoteData.value;
    } else if (Array.isArray(actionNoteData)) {
      actionNoteArray = actionNoteData;
    }
    
    // Group ActionNotes by Contact and UserRef, keeping the one with due date closest to today
    // If there are past due dates, prioritize the furthest in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    
    actionNoteArray.forEach(note => {
      if (note.Contact && note.UserRef) {
        const key = `${note.Contact.toLowerCase()}-${note.UserRef.toLowerCase()}`;
        
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
          // First note for this contact-userref combination
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

    // Filter sales based on show excluded toggle
    const showExcluded = showExcludedInput.checked;
    let filteredSalesArray;
    
    if (showExcluded) {
      // Show all sales (including excluded ones)
      filteredSalesArray = salesArray;
    } else {
      // Hide excluded sales (default behavior)
      filteredSalesArray = salesArray.filter(sale => !sale.ANExclude);
    }

    // Group sales by contact name and account, keeping only the most recent sale for each combination
    const uniqueSalesMap = new Map();
    filteredSalesArray.forEach(sale => {
      if (sale.Contact && sale.AccountNickname) {
        const key = `${sale.Contact.trim()}-${sale.AccountNickname.trim()}`;
        const existingSale = uniqueSalesMap.get(key);
        
        if (!existingSale) {
          // First sale for this contact/account combination
          uniqueSalesMap.set(key, sale);
        } else {
          // Compare dates to keep the most recent sale
          const currentDate = new Date(sale.Date);
          const existingDate = new Date(existingSale.Date);
          
          if (currentDate > existingDate) {
            // Current sale is more recent
            uniqueSalesMap.set(key, sale);
          }
        }
      }
    });
    
    // Convert map back to array for display
    const uniqueSalesArray = Array.from(uniqueSalesMap.values());

    // Sort by account name alphabetically
    uniqueSalesArray.sort((a, b) => {
      const accountA = (a.AccountNickname || '').toUpperCase();
      const accountB = (b.AccountNickname || '').toUpperCase();
      return accountA.localeCompare(accountB);
    });

    const reportHtml = `
      <div class="space-y-6">
        <!-- Report Header -->
        <div class="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
          <h3 class="text-lg font-medium text-gray-800">Sales & Action Note Details</h3>
          <span class="text-sm text-gray-600">Contacts: <span id="tableContactsCountValue" class="font-semibold">0</span></span>
        </div>
        <!-- Sales and Action Note Data Table -->
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account<br>Contact Name</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exclude</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Description<br>Sale Date & Price</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AN Number</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Follow-up Date<br>Description</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Touch</th>
                </tr>
              </thead>
              <tbody class="bg-white">
                ${uniqueSalesArray.map((sale, index) => {
                  // Match action note by both Contact and UserRef (case-insensitive)
                  const actionNoteKey = `${sale.Contact.toLowerCase()}-${sale.UserRef.toLowerCase()}`;
                  const actionNote = actionNoteMap[actionNoteKey];
                  
                  // Store row data globally for access by click handler
                  const rowId = `row-${index}`;
                  
                  return `
                    <tr class="hover:bg-gray-50 cursor-pointer clickable-row ${sale.ANExclude ? 'bg-red-50' : ''}" data-row-id="${rowId}" data-sale-id="${sale._ID}">
                      <td class="px-3 py-2 text-sm">
                        <div class="font-medium text-gray-900">${sale.AccountNickname || 'N/A'}</div>
                        <div class="text-gray-600">${sale.Contact || 'N/A'}</div>
                      </td>
                      <td class="px-3 py-2 text-sm text-center">
                        <button class="px-2 py-1 text-xs font-medium rounded ${sale.ANExclude ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200'} exclude-button cursor-pointer" data-row-id="${rowId}" data-sale-id="${sale._ID}" data-excluded="${sale.ANExclude ? 'true' : 'false'}">
                          ${sale.ANExclude ? 'Excluded' : 'Exclude'}
                        </button>
                      </td>
                      <td class="px-3 py-2 text-sm">
                        <div class="text-gray-900">${sale.Description || 'N/A'}</div>
                        <div class="text-gray-600">${formatDate(sale.Date)} ${sale.Total ? '• $' + parseFloat(sale.Total).toLocaleString() : ''}</div>
                      </td>
                      <td class="px-3 py-2 text-sm text-gray-900">${actionNote ? (actionNote.DocType ? (actionNote.DocType + ' - ' + (actionNote.DocNumber || '')) : (actionNote.DocNumber || '')) : ''}</td>
                      <td class="px-3 py-2 text-sm" colspan="3">
                        <div class="grid grid-cols-3 gap-3">
                          <div class="text-gray-900">${formatDate(actionNote?.DueDate)}</div>
                          <div class="text-gray-900">${actionNote?.UserRef || sale.UserRef || '-'}</div>
                          <div class="text-gray-900">${formatDate(actionNote?.LastAction)}</div>
                        </div>
                        <div class="text-gray-600 mt-1">${actionNote?.DocDescription || '-'}</div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    reportContent.innerHTML = reportHtml;
    
    // Update contacts count after report is rendered
    updateContactsCount();
    
    // Store row data for click handlers and add event listeners
    window.reportRowData = {};
    // Use unique sales array (one per contact/account combination)
    uniqueSalesArray.forEach((sale, index) => {
      const actionNoteKey = `${sale.Contact.toLowerCase()}-${sale.UserRef.toLowerCase()}`;
      const actionNote = actionNoteMap[actionNoteKey];
      const rowId = `row-${index}`;
      
      // Store the row data
      window.reportRowData[rowId] = {
        mode: 'view',
        sale: {
          Account: sale.AccountNickname || '',
          Contact: sale.Contact || '',
          Contact_ID: sale.Contact_ID || '',
          ANExclude: sale.ANExclude || false,
          Number: sale.Number || '',
          Date: sale.Date || '',
          Description: sale.Description || '',
          Total: sale.Total || '',
          UserRef: sale.UserRef || '',
          _ID: sale._ID || ''
        },
        actionNote: actionNote ? {
          DueDate: actionNote.DueDate || '',
          DocDescription: actionNote.DocDescription || '',
          LastAction: actionNote.LastAction || '',
          UserRef: actionNote.UserRef || '',
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
        // Don't trigger row click if exclude button was clicked
        if (e.target.classList.contains('exclude-button')) {
          return;
        }
        
        const rowId = this.getAttribute('data-row-id');
        const rowData = window.reportRowData[rowId];
        if (rowData) {
          handleRowClick(rowData);
        }
      });
    });
    
    // Add click event listeners to all exclude buttons
    document.querySelectorAll('.exclude-button').forEach(button => {
      button.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent row click from firing
        
        const rowId = this.getAttribute('data-row-id');
        const rowData = window.reportRowData[rowId];
        if (rowData) {
          // Toggle the exclude state for data tracking
          const currentExcluded = this.getAttribute('data-excluded') === 'true';
          const newExcluded = !currentExcluded;
          
          // Only prevent exclusion (not un-exclusion) if there is an ActionNote
          if (newExcluded && rowData.actionNote && rowData.actionNote._ID) {
            // Display error and do not proceed with exclusion
            alert('Cannot exclude this record because it has an associated ActionNote.');
            return;
          }
          
          // Get the contact and userref for this row to find all matching rows
          const contact = rowData.sale.Contact;
          const userRef = rowData.sale.UserRef;
          
          // Find all rows with the same Contact and UserRef combination (case-insensitive)
          const matchingRowIds = [];
          for (const [storedRowId, storedRowData] of Object.entries(window.reportRowData)) {
            if (storedRowData.sale && 
                storedRowData.sale.Contact && 
                storedRowData.sale.UserRef &&
                storedRowData.sale.Contact.toLowerCase() === contact.toLowerCase() && 
                storedRowData.sale.UserRef.toLowerCase() === userRef.toLowerCase()) {
              matchingRowIds.push(storedRowId);
            }
          }
          
          // Update all matching buttons and row data
          matchingRowIds.forEach(matchingRowId => {
            const matchingButton = document.querySelector(`[data-row-id="${matchingRowId}"]`);
            const matchingRow = document.querySelector(`tr[data-row-id="${matchingRowId}"]`);
            
            if (matchingButton) {
              // Update data attribute for tracking
              matchingButton.setAttribute('data-excluded', newExcluded.toString());
              
              // Update button appearance and text based on new state
              if (newExcluded) {
                matchingButton.textContent = 'Excluded';
                matchingButton.className = 'px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 border border-red-300 exclude-button cursor-pointer';
              } else {
                matchingButton.textContent = 'Exclude';
                matchingButton.className = 'px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 exclude-button cursor-pointer';
              }
            }
            
            // Update row background styling
            if (matchingRow) {
              if (newExcluded) {
                matchingRow.className = 'hover:bg-gray-50 cursor-pointer clickable-row bg-red-50';
              } else {
                matchingRow.className = 'hover:bg-gray-50 cursor-pointer clickable-row';
              }
            }
            
            // Update the sale.ANExclude data in the stored row data
            if (window.reportRowData[matchingRowId] && window.reportRowData[matchingRowId].sale) {
              window.reportRowData[matchingRowId].sale.ANExclude = newExcluded;
            }
            
            // Only hide rows if "Show Excluded" is NOT checked AND we're excluding the record
            if (newExcluded && !showExcludedInput.checked) {
              // Find and hide all rows with this sale ID (main row and description row)
              const rowsToHide = document.querySelectorAll(`[data-sale-id="${window.reportRowData[matchingRowId].sale._ID}"]`);
              rowsToHide.forEach(row => {
                row.style.display = 'none';
              });
            } else if (!newExcluded || showExcludedInput.checked) {
              // Show rows if we're un-excluding OR if "Show Excluded" is checked
              const rowsToShow = document.querySelectorAll(`[data-sale-id="${window.reportRowData[matchingRowId].sale._ID}"]`);
              rowsToShow.forEach(row => {
                row.style.display = '';
              });
            }
          });
          
          // Also update in the current sales data if available (case-insensitive matching)
          if (window.currentSalesData && window.currentSalesData.value) {
            window.currentSalesData.value.forEach(sale => {
              if (sale.Contact && sale.UserRef &&
                  sale.Contact.toLowerCase() === contact.toLowerCase() && 
                  sale.UserRef.toLowerCase() === userRef.toLowerCase()) {
                sale.ANExclude = newExcluded;
              }
            });
          }
          
          // Update contacts count after showing/hiding rows
          updateContactsCount();
          
          // Create a copy of the row data with mode set to 'exclude'
          const excludeData = {
            ...rowData,
            mode: 'exclude',
            excludeValue: newExcluded,
            ANExclude: newExcluded
          };
          handleExcludeClick(excludeData);
          
          // If "Show Excluded" is checked, regenerate the report to ensure proper display
          if (showExcludedInput.checked && window.currentSalesData && window.currentActionNoteData) {
            console.log('Show Excluded is checked - regenerating report to ensure proper display');
            setTimeout(() => {
              generateReport(window.currentSalesData, window.currentActionNoteData);
            }, 100); // Small delay to ensure FileMaker updates are processed first
          }
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