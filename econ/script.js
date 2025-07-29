document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const countrySelect = document.getElementById('countrySelect');
    const countrySearch = document.getElementById('countrySearch');
    const regionFilter = document.getElementById('regionFilter');
    const incomeFilter = document.getElementById('incomeFilter');
    const addCountryBtn = document.getElementById('addCountryBtn');
    const compareBtn = document.getElementById('compareBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const countryTags = document.getElementById('countryTags');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const dataContainer = document.getElementById('dataContainer');
    const emptyState = document.getElementById('emptyState');
    const viewToggle = document.getElementById('viewToggle');
    const chartsViewBtn = document.getElementById('chartsViewBtn');
    const tablesViewBtn = document.getElementById('tablesViewBtn');
    const chartsView = document.getElementById('chartsView');
    const tablesView = document.getElementById('tablesView');
    const darkModeToggle = document.getElementById('darkModeToggle');

    // State
    let allCountries = [];
    let selectedCountries = [];
    let economicData = {};
    let charts = {};
    let currentView = 'charts';

    // API Configuration
    const WORLD_BANK_API = 'https://api.worldbank.org/v2';
    const REST_COUNTRIES_API = 'https://restcountries.com/v3.1';
    
    const INDICATORS = {
        'NY.GDP.MKTP.CD': { name: 'Nominal GDP', unit: 'USD', format: 'currency' },
        'NY.GDP.MKTP.KD': { name: 'Real GDP', unit: 'USD (constant)', format: 'currency' },
        'NY.GDP.PCAP.CD': { name: 'GDP per capita', unit: 'USD', format: 'currency' },
        'NE.EXP.GNFS.CD': { name: 'Exports', unit: 'USD', format: 'currency' },
        'NE.IMP.GNFS.CD': { name: 'Imports', unit: 'USD', format: 'currency' },
        'SI.POV.GINI': { name: 'Gini coefficient', unit: 'Index', format: 'decimal' },
        'NY.GDP.MKTP.KD.ZG': { name: 'GDP growth rate', unit: '%', format: 'percentage' },
        'FP.CPI.TOTL.ZG': { name: 'Inflation Rate (CPI)', unit: '%', format: 'percentage' },
        'FR.INR.RINR': { name: 'Real Interest Rate', unit: '%', format: 'percentage' },
        'FR.INR.LEND': { name: 'Lending Interest Rate', unit: '%', format: 'percentage' },
        'SL.UEM.TOTL.ZS': { name: 'Unemployment Rate', unit: '%', format: 'percentage' },
        'SP.POP.TOTL': { name: 'Population', unit: 'People', format: 'number' },
        'SP.POP.GROW': { name: 'Population Growth Rate', unit: '%', format: 'percentage' },
        'PA.NUS.FCRF': { name: 'Exchange Rate (LCU per USD)', unit: 'LCU/USD', format: 'decimal' }
    };

    // Time range settings for each chart
    let chartTimeRanges = {
        gdp: 10,
        gdpPerCapita: 10,
        trade: 10,
        gdpGrowth: 10,
        gini: 10,
        inflation: 10,
        interest: 10,
        unemployment: 10,
        population: 10,
        exchange: 10,
        populationGrowth: 10,
        oil: 10,
        gas: 10,
        gold: 10
    };

    // Global commodity data (not country-specific)

    // Initialize the application
    async function init() {
        try {
            showLoading();
            await loadCountries();
            setupEventListeners();
            setupDarkMode();
            hideLoading();
        } catch (error) {
            console.error('Initialization error:', error);
            showError('Failed to initialize the application. Please refresh the page.');
            hideLoading();
        }
    }

    // Load countries from REST Countries API and World Bank
    async function loadCountries() {
        try {
            // Fetch from REST Countries for basic info and flags
            const restResponse = await fetch(`${REST_COUNTRIES_API}/all?fields=name,cca3,flag,region`);
            const restCountries = await restResponse.json();

            // Fetch from World Bank for additional metadata
            const wbResponse = await fetch(`${WORLD_BANK_API}/country?format=json&per_page=300`);
            const [, wbCountries] = await wbResponse.json();

            // Merge data from both sources
            allCountries = restCountries
                .map(restCountry => {
                    const wbCountry = wbCountries.find(wb => wb.id === restCountry.cca3);
                    return {
                        code: restCountry.cca3,
                        name: restCountry.name.common,
                        flag: restCountry.flag,
                        region: restCountry.region,
                        incomeLevel: wbCountry?.incomeLevel?.id || '',
                        capitalCity: wbCountry?.capitalCity || ''
                    };
                })
                .filter(country => country.capitalCity) // Filter out regions/aggregates
                .sort((a, b) => a.name.localeCompare(b.name));

            populateCountryDropdown();
        } catch (error) {
            console.error('Error loading countries:', error);
            throw new Error('Failed to load country data');
        }
    }

    // Populate country dropdown
    function populateCountryDropdown() {
        countrySelect.innerHTML = '<option value="">Select a country...</option>';
        
        const filteredCountries = filterCountries();
        
        filteredCountries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = `${country.flag} ${country.name}`;
            option.dataset.name = country.name;
            option.dataset.region = country.region;
            option.dataset.incomeLevel = country.incomeLevel;
            countrySelect.appendChild(option);
        });
    }

    // Filter countries based on search and filters
    function filterCountries() {
        const searchTerm = countrySearch.value.toLowerCase();
        const regionFilter = document.getElementById('regionFilter').value;
        const incomeFilter = document.getElementById('incomeFilter').value;

        return allCountries.filter(country => {
            const matchesSearch = country.name.toLowerCase().includes(searchTerm);
            const matchesRegion = !regionFilter || country.region === regionFilter;
            const matchesIncome = !incomeFilter || country.incomeLevel === incomeFilter;
            
            return matchesSearch && matchesRegion && matchesIncome;
        });
    }

    // Setup event listeners
    function setupEventListeners() {
        addCountryBtn.addEventListener('click', addSelectedCountry);
        compareBtn.addEventListener('click', compareCountries);
        clearAllBtn.addEventListener('click', clearAllCountries);
        chartsViewBtn.addEventListener('click', () => switchView('charts'));
        tablesViewBtn.addEventListener('click', () => switchView('tables'));
        
        countrySearch.addEventListener('input', populateCountryDropdown);
        regionFilter.addEventListener('change', populateCountryDropdown);
        incomeFilter.addEventListener('change', populateCountryDropdown);
        
        // Time range event listeners
        setupTimeRangeListeners();
        
        // Allow adding country with Enter key
        countrySelect.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                addSelectedCountry();
            }
        });
    }

    // Setup time range listeners for all charts
    function setupTimeRangeListeners() {
        const chartIds = ['gdp', 'gdpPerCapita', 'trade', 'gdpGrowth', 'gini', 'inflation', 'interest', 'unemployment', 'population', 'exchange', 'populationGrowth', 'oil', 'gas', 'gold'];
        
        chartIds.forEach(chartId => {
            // Time range listeners
            const timeSelector = document.getElementById(`${chartId}TimeRange`);
            if (timeSelector) {
                timeSelector.addEventListener('change', (e) => {
                    chartTimeRanges[chartId] = parseInt(e.target.value);
                    if (chartId === 'oil' || chartId === 'gas' || chartId === 'gold') {
                        // Commodity charts don't need countries
                        renderSpecificChart(chartId);
                    } else if (selectedCountries.length > 0) {
                        renderSpecificChart(chartId);
                    }
                });
            }
        });

        // Real-time GDP Growth Rate updates
        setupRealTimeGDPGrowth();
        
        // Load commodity data on initialization
    }

    // Setup real-time GDP Growth Rate updates
    function setupRealTimeGDPGrowth() {
        // Update GDP Growth chart whenever countries are added/removed
        const originalUpdateTags = updateCountryTags;
        updateCountryTags = function() {
            originalUpdateTags.call(this);
            if (selectedCountries.length > 0) {
                renderGDPGrowthChart();
            }
        };
    }

    // Render specific chart based on ID
    function renderSpecificChart(chartId) {
        switch(chartId) {
            case 'gdp':
                renderGDPChart();
                break;
            case 'gdpPerCapita':
                renderGDPPerCapitaChart();
                break;
            case 'trade':
                renderTradeChart();
                break;
            case 'gdpGrowth':
                renderGDPGrowthChart();
                break;
            case 'gini':
                renderGiniChart();
                break;
            case 'inflation':
                renderInflationChart();
                break;
            case 'interest':
                renderInterestChart();
                break;
            case 'unemployment':
                renderUnemploymentChart();
                break;
            case 'population':
                renderPopulationChart();
                break;
            case 'exchange':
                renderExchangeChart();
                break;
            case 'populationGrowth':
                renderPopulationGrowthChart();
                break;
            case 'oil':
                renderOilChart();
                break;
            case 'gas':
                renderGasChart();
                break;
            case 'gold':
                renderGoldChart();
                break;
        }
    }

    // Load commodity data from external APIs




    

    // Add selected country to comparison list
    function addSelectedCountry() {
        const selectedCode = countrySelect.value;
        if (!selectedCode) {
            showError('Please select a country first.');
            return;
        }

        const country = allCountries.find(c => c.code === selectedCode);
        if (!country) return;

        // Check if country is already selected
        if (selectedCountries.find(c => c.code === selectedCode)) {
            showError('This country is already selected.');
            return;
        }

        // Limit to 5 countries for better visualization
        if (selectedCountries.length >= 5) {
            showError('Maximum 5 countries can be compared at once.');
            return;
        }

        selectedCountries.push(country);
        updateCountryTags();
        countrySelect.value = '';
        hideError();
    }

    // Update country tags display
    function updateCountryTags() {
        countryTags.innerHTML = '';
        
        selectedCountries.forEach(country => {
            const tag = document.createElement('div');
            tag.className = 'flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-2 rounded-lg';
            tag.innerHTML = `
                <span class="mr-2">${country.flag}</span>
                <span class="mr-2">${country.name}</span>
                <button class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200" onclick="removeCountry('${country.code}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            countryTags.appendChild(tag);
        });

        // Show/hide compare button
        compareBtn.style.display = selectedCountries.length > 0 ? 'flex' : 'none';
        clearAllBtn.style.display = selectedCountries.length > 0 ? 'flex' : 'none';
    }

    // Remove country from selection
    window.removeCountry = function(countryCode) {
        selectedCountries = selectedCountries.filter(c => c.code !== countryCode);
        updateCountryTags();
        
        if (selectedCountries.length === 0) {
            hideDataContainer();
        } else {
            compareCountries(); // Refresh data display
        }
    };

    // Clear all selected countries
    function clearAllCountries() {
        selectedCountries = [];
        updateCountryTags();
        hideDataContainer();
    }

    // Compare selected countries
    async function compareCountries() {
        if (selectedCountries.length === 0) {
            showError('Please select at least one country to compare.');
            return;
        }

        try {
            showLoading();
            hideError();
            
            // Fetch data for all selected countries
            for (const country of selectedCountries) {
                if (!economicData[country.code]) {
                    economicData[country.code] = await fetchEconomicData(country.code);
                }
            }

            showDataContainer();
            if (currentView === 'charts') {
                renderCharts();
            } else {
                renderTables();
            }
            
        } catch (error) {
            console.error('Error comparing countries:', error);
            showError('Failed to fetch economic data. Please try again.');
        } finally {
            hideLoading();
        }
    }

    // Fetch economic data for a country
    async function fetchEconomicData(countryCode) {
        const data = {};
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 25; // Get 25 years of data for flexibility
        
        for (const [indicatorCode, indicatorInfo] of Object.entries(INDICATORS)) {
            try {
                const response = await fetch(
                    `${WORLD_BANK_API}/country/${countryCode}/indicator/${indicatorCode}?format=json&per_page=30&date=${startYear}:${currentYear}`
                );
                
                if (!response.ok) continue;
                
                const [, values] = await response.json();
                if (values && values.length > 0) {
                    // Filter and sort time series data
                    const timeSeries = values
                        .filter(v => v.value !== null && v.value !== undefined)
                        .sort((a, b) => parseInt(a.date) - parseInt(b.date));
                    
                    // Get the most recent non-null value
                    const latestValue = timeSeries[timeSeries.length - 1];
                    
                    data[indicatorCode] = {
                        ...indicatorInfo,
                        value: latestValue?.value || null,
                        year: latestValue?.date || null,
                        timeSeries: timeSeries
                    };
                } else {
                    // Set default structure even if no data
                    data[indicatorCode] = {
                        ...indicatorInfo,
                        value: null,
                        year: null,
                        timeSeries: []
                    };
                }
            } catch (error) {
                console.error(`Error fetching ${indicatorCode} for ${countryCode}:`, error);
                // Set default structure on error
                data[indicatorCode] = {
                    ...indicatorInfo,
                    value: null,
                    year: null,
                    timeSeries: []
                };
            }
        }
        
        return data;
    }

    // Get time series data for specific time range
    function getTimeSeriesData(countryCode, indicatorCode, years) {
        const data = economicData[countryCode][indicatorCode];
        if (!data || !data.timeSeries || data.timeSeries.length === 0) {
            return [];
        }
        
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - years;
        
        return data.timeSeries
            .filter(item => parseInt(item.date) >= startYear)
            .sort((a, b) => parseInt(a.date) - parseInt(b.date));
    }

    // Update timestamp display
    function updateTimestamp(chartId, data) {
        const timestampElement = document.getElementById(`${chartId}Timestamp`);
        if (timestampElement && data && data.length > 0) {
            const latestYear = data[data.length - 1]?.date;
            const oldestYear = data[0]?.date;
            timestampElement.textContent = `Data: ${oldestYear} - ${latestYear}`;
        } else if (timestampElement) {
            timestampElement.textContent = 'No data available';
        }
    }

function renderInflationChart() {
    const ctx = document.getElementById('inflationChart').getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');

    const inflationData = selectedCountries.map(country => {
        const inflation = economicData[country.code]['FP.CPI.TOTL.ZG']; // World Bank CPI Inflation (% annual)
        return inflation?.value || 0;
    });

    charts.inflation = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: selectedCountries.map(c => c.name),
            datasets: [{
                label: 'Inflation Rate (%)',
                data: inflationData,
                backgroundColor: selectedCountries.map((_, index) => `rgba(59, 130, 246, 0.8)`), // Blue
                borderColor: selectedCountries.map((_, index) => `rgba(59, 130, 246, 1)`),
                borderWidth: 3,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    titleColor: isDark ? '#f3f4f6' : '#374151',
                    bodyColor: isDark ? '#d1d5db' : '#6b7280',
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    borderWidth: 1,
                    cornerRadius: 12,
                    callbacks: {
                        label: function(context) {
                            return 'Inflation: ' + context.parsed.y.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: isDark ? '#d1d5db' : '#6b7280',
                        font: { family: 'Inter', size: 12 }
                    },
                    grid: {
                        color: isDark ? '#374151' : '#f3f4f6',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: isDark ? '#d1d5db' : '#6b7280',
                        font: { family: 'Inter', size: 12 },
                        maxRotation: 45
                    },
                    grid: { display: false }
                }
            }
        }
    });
}


function renderInterestChart() {
    const ctx = document.getElementById('interestChart').getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');

    const interestData = selectedCountries.map(country => {
        const interest = economicData[country.code]['FR.INR.RINR'];
        return interest?.value || 0;
    });

    charts.interest = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: selectedCountries.map(c => c.name),
            datasets: [{
                label: 'Interest Rate (%)',
                data: interestData,
                backgroundColor: selectedCountries.map(() => `rgba(34, 197, 94, 0.8)`),  // Green
                borderColor: selectedCountries.map(() => `rgba(34, 197, 94, 1)`),
                borderWidth: 3,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    titleColor: isDark ? '#f3f4f6' : '#374151',
                    bodyColor: isDark ? '#d1d5db' : '#6b7280',
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    borderWidth: 1,
                    cornerRadius: 12,
                    callbacks: {
                        label: function(context) {
                            return 'Interest Rate: ' + context.parsed.y.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: isDark ? '#d1d5db' : '#6b7280',
                        font: { family: 'Inter', size: 12 }
                    },
                    grid: {
                        color: isDark ? '#374151' : '#f3f4f6',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: isDark ? '#d1d5db' : '#6b7280',
                        font: { family: 'Inter', size: 12 },
                        maxRotation: 45
                    },
                    grid: { display: false }
                }
            }
        }
    });
}
function renderPopulationGrowthChart() {
    const ctx = document.getElementById('populationGrowthChart').getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');

    const popGrowthData = selectedCountries.map(country => {
        const growth = economicData[country.code]['SP.POP.GROW']; // Population Growth (% annual)
        return growth?.value || 0;
    });

    charts.populationGrowth = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: selectedCountries.map(c => c.name),
            datasets: [{
                label: 'Population Growth (%)',
                data: popGrowthData,
                backgroundColor: selectedCountries.map(() => `rgba(251, 191, 36, 0.8)`),  // Amber
                borderColor: selectedCountries.map(() => `rgba(251, 191, 36, 1)`),
                borderWidth: 3,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    titleColor: isDark ? '#f3f4f6' : '#374151',
                    bodyColor: isDark ? '#d1d5db' : '#6b7280',
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    borderWidth: 1,
                    cornerRadius: 12,
                    callbacks: {
                        label: function(context) {
                            return 'Growth: ' + context.parsed.y.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: isDark ? '#d1d5db' : '#6b7280',
                        font: { family: 'Inter', size: 12 }
                    },
                    grid: {
                        color: isDark ? '#374151' : '#f3f4f6',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: isDark ? '#d1d5db' : '#6b7280',
                        font: { family: 'Inter', size: 12 },
                        maxRotation: 45
                    },
                    grid: { display: false }
                }
            }
        }
    });
}




    // Render charts
    function renderCharts() {
        destroyExistingCharts();
        
        // GDP Comparison Chart
        renderGDPChart();
        
        // GDP Per Capita Chart
        renderGDPPerCapitaChart();
        
        // Trade Balance Chart
        renderTradeChart();
        
        // GDP Growth Rate Chart
        renderGDPGrowthChart();
        
        // Gini Coefficient Chart
        renderGiniChart();
        
        // Inflation Chart
        renderInflationChart();
        
        // Interest Rate Chart
        renderInterestChart();
        
        // Unemployment Rate Chart
        renderUnemploymentChart();
        
        // Population Chart
        renderPopulationChart();
        
        // Exchange Rate Chart
        renderExchangeChart();
        
        // Population Growth Rate Chart
        renderPopulationGrowthChart();
        
        // Commodity Charts (render immediately as they don't depend on country selection)
      
    }

    // Render GDP Chart
    function renderGDPChart() {
        const ctx = document.getElementById('gdpChart').getContext('2d');
        const isDark = document.documentElement.classList.contains('dark');
        
        const datasets = selectedCountries.map((country, index) => {
            const data = economicData[country.code];
            const nominalGDP = data['NY.GDP.MKTP.CD'];
            
            return {
                label: `${country.name}`,
                data: [nominalGDP?.value || 0],
                backgroundColor: getChartColor(index, 0.8),
                borderColor: getChartColor(index, 1),
                borderWidth: 3,
                borderRadius: 8,
                borderSkipped: false,
            };
        });

        charts.gdp = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: selectedCountries.map(c => c.name),
                datasets: [{
                    label: 'GDP (USD)',
                    data: selectedCountries.map(country => {
                        const data = economicData[country.code];
                        const nominalGDP = data['NY.GDP.MKTP.CD'];
                        return nominalGDP?.value || 0;
                    }),
                    backgroundColor: selectedCountries.map((_, index) => getChartColor(index, 0.8)),
                    borderColor: selectedCountries.map((_, index) => getChartColor(index, 1)),
                    borderWidth: 3,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1f2937' : '#ffffff',
                        titleColor: isDark ? '#f3f4f6' : '#374151',
                        bodyColor: isDark ? '#d1d5db' : '#6b7280',
                        borderColor: isDark ? '#374151' : '#e5e7eb',
                        borderWidth: 1,
                        cornerRadius: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                return 'GDP: $' + (value / 1e9).toFixed(2) + 'B';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: isDark ? '#9ca3af' : '#6b7280',
                            font: {
                                family: 'Inter',
                                size: 12
                            },
                            callback: function(value) {
                                if (value >= 1e12) return '$' + (value / 1e12).toFixed(1) + 'T';
                                if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
                                if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
                                return '$' + value.toLocaleString();
                            }
                        },
                        grid: {
                            color: isDark ? '#374151' : '#f3f4f6',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: isDark ? '#9ca3af' : '#6b7280',
                            font: {
                                family: 'Inter',
                                size: 12
                            },
                            maxRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Render GDP Per Capita Chart (Doughnut)
    function renderGDPPerCapitaChart() {
        const ctx = document.getElementById('gdpPerCapitaChart').getContext('2d');
        const isDark = document.documentElement.classList.contains('dark');
        
        const data = selectedCountries.map(country => {
            const gdpPerCapita = economicData[country.code]['NY.GDP.PCAP.CD'];
            return gdpPerCapita?.value || 0;
        });

        // Update timestamp with latest data year
        const latestYear = selectedCountries.reduce((latest, country) => {
            const year = economicData[country.code]['NY.GDP.PCAP.CD']?.year;
            return year && year > latest ? year : latest;
        }, '');
        updateTimestamp('gdpPerCapita', [{ date: latestYear }, { date: latestYear }]);

        charts.gdpPerCapita = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: selectedCountries.map(c => c.name),
                datasets: [{
                    data: data,
                    backgroundColor: selectedCountries.map((_, index) => getChartColor(index, 0.8)),
                    borderColor: isDark ? '#1f2937' : '#ffffff',
                    borderWidth: 4,
                    hoverBackgroundColor: selectedCountries.map((_, index) => getChartColor(index, 1)),
                    hoverBorderWidth: 6
                }]
            },
            options: getPieChartOptions(isDark, (value) => '$' + value.toLocaleString())
        });
    }

    // Render Trade Chart
    function renderTradeChart() {
        const ctx = document.getElementById('tradeChart').getContext('2d');
        const isDark = document.documentElement.classList.contains('dark');
        
        const exportData = selectedCountries.map(country => {
            const exports = economicData[country.code]['NE.EXP.GNFS.CD'];
            return exports?.value || 0;
        });

        const importData = selectedCountries.map(country => {
            const imports = economicData[country.code]['NE.IMP.GNFS.CD'];
            return imports?.value || 0;
        });

        charts.trade = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: selectedCountries.map(c => c.name),
                datasets: [
                    {
                        label: 'Exports',
                        data: exportData,
                        backgroundColor: 'rgba(34, 197, 94, 0.8)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 3,
                        borderRadius: 6,
                        borderSkipped: false
                    },
                    {
                        label: 'Imports',
                        data: importData,
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: 'rgba(239, 68, 68, 1)',
                        borderWidth: 3,
                        borderRadius: 6,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        labels: {
                            color: isDark ? '#f3f4f6' : '#374151',
                            font: {
                                family: 'Inter',
                                size: 12
                            },
                            usePointStyle: true,
                            pointStyle: 'rect'
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1f2937' : '#ffffff',
                        titleColor: isDark ? '#f3f4f6' : '#374151',
                        bodyColor: isDark ? '#d1d5db' : '#6b7280',
                        borderColor: isDark ? '#374151' : '#e5e7eb',
                        borderWidth: 1,
                        cornerRadius: 12,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                return context.dataset.label + ': $' + (value / 1e9).toFixed(2) + 'B';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: isDark ? '#9ca3af' : '#6b7280',
                            font: {
                                family: 'Inter',
                                size: 12
                            },
                            callback: function(value) {
                                if (value >= 1e12) return '$' + (value / 1e12).toFixed(1) + 'T';
                                if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
                                if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
                                return '$' + value.toLocaleString();
                            }
                        },
                        grid: {
                            color: isDark ? '#374151' : '#f3f4f6',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: isDark ? '#9ca3af' : '#6b7280',
                            font: {
                                family: 'Inter',
                                size: 12
                            },
                            maxRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Render GDP Growth Rate Chart
    function renderGDPGrowthChart() {
        const ctx = document.getElementById('gdpGrowthChart').getContext('2d');
        const isDark = document.documentElement.classList.contains('dark');
        
        const timeRange = chartTimeRanges.gdpGrowth;
        const datasets = selectedCountries.map((country, index) => {
            const timeSeriesData = getTimeSeriesData(country.code, 'NY.GDP.MKTP.KD.ZG', timeRange);
            
            return {
                label: country.name,
                data: timeSeriesData.map(item => item.value),
                borderColor: getChartColor(index, 1),
                backgroundColor: getChartColor(index, 0.1),
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                pointBackgroundColor: getChartColor(index, 1),
                pointBorderColor: isDark ? '#1f2937' : '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            };
        });

        // Get all unique years
        const allYears = new Set();
        selectedCountries.forEach(country => {
            const timeSeriesData = getTimeSeriesData(country.code, 'NY.GDP.MKTP.KD.ZG', timeRange);
            timeSeriesData.forEach(item => allYears.add(item.date));
        });
        const sortedYears = Array.from(allYears).sort();

        // Update timestamp
        if (sortedYears.length > 0) {
            updateTimestamp('gdpGrowth', [{ date: sortedYears[0] }, { date: sortedYears[sortedYears.length - 1] }]);
        }

        charts.gdpGrowth = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedYears,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: isDark ? '#f3f4f6' : '#374151',
                            font: { family: 'Inter', size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1f2937' : '#ffffff',
                        titleColor: isDark ? '#f3f4f6' : '#374151',
                        bodyColor: isDark ? '#d1d5db' : '#6b7280',
                        borderColor: isDark ? '#374151' : '#e5e7eb',
                        borderWidth: 1,
                        cornerRadius: 12,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            color: isDark ? '#d1d5db' : '#6b7280',
                            font: { family: 'Inter', size: 12 },
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        },
                        grid: {
                            color: isDark ? '#374151' : '#f3f4f6',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: isDark ? '#d1d5db' : '#6b7280',
                            font: { family: 'Inter', size: 12 },
                            maxRotation: 45
                        },
                        grid: {
                            color: isDark ? '#374151' : '#f3f4f6',
                            drawBorder: false
                        }
                    }
                }
            }
        });
    }

    // Render Gini Coefficient Chart
    function renderGiniChart() {
        const ctx = document.getElementById('giniChart').getContext('2d');
        const isDark = document.documentElement.classList.contains('dark');
        
        const giniData = selectedCountries.map(country => {
            const gini = economicData[country.code]['SI.POV.GINI'];
            return gini?.value || 0;
        });

        charts.gini = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: selectedCountries.map(c => c.name),
                datasets: [{
                    label: 'Gini Coefficient',
                    data: giniData,
                    backgroundColor: selectedCountries.map((_, index) => `rgba(236, 72, 153, 0.8)`),
                    borderColor: selectedCountries.map((_, index) => `rgba(236, 72, 153, 1)`),
                    borderWidth: 3,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1f2937' : '#ffffff',
                        titleColor: isDark ? '#f3f4f6' : '#374151',
                        bodyColor: isDark ? '#d1d5db' : '#6b7280',
                        borderColor: isDark ? '#374151' : '#e5e7eb',
                        borderWidth: 1,
                        cornerRadius: 12,
                        callbacks: {
                            label: function(context) {
                                return 'Gini: ' + context.parsed.y.toFixed(1);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: isDark ? '#d1d5db' : '#6b7280',
                            font: { family: 'Inter', size: 12 }
                        },
                        grid: {
                            color: isDark ? '#374151' : '#f3f4f6',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: isDark ? '#d1d5db' : '#6b7280',
                            font: { family: 'Inter', size: 12 },
                            maxRotation: 45
                        },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Render Inflation & Interest Rates Chart
    function renderRatesChart() {
        const ctx = document.getElementById('ratesChart').getContext('2d');
        const isDark = document.documentElement.classList.contains('dark');
        
        const inflationData = selectedCountries.map(country => {
            const inflation = economicData[country.code]['FP.CPI.TOTL.ZG'];
            return inflation?.value || 0;
        });

        const interestData = selectedCountries.map(country => {
            const interest = economicData[country.code]['FR.INR.RINR'];
            return interest?.value || 0;
        });

        charts.rates = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: selectedCountries.map(c => c.name),
                datasets: [
                    {
                        label: 'Inflation Rate (%)',
                        data: inflationData,
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: 'rgba(239, 68, 68, 1)',
                        borderWidth: 3,
                        borderRadius: 6,
                        borderSkipped: false
                    },
                    {
                        label: 'Interest Rate (%)',
                        data: interestData,
                        backgroundColor: 'rgba(245, 101, 101, 0.8)',
                        borderColor: 'rgba(245, 101, 101, 1)',
                        borderWidth: 3,
                        borderRadius: 6,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: isDark ? '#f3f4f6' : '#374151',
                            font: { family: 'Inter', size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1f2937' : '#ffffff',
                        titleColor: isDark ? '#f3f4f6' : '#374151',
                        bodyColor: isDark ? '#d1d5db' : '#6b7280',
                        borderColor: isDark ? '#374151' : '#e5e7eb',
                        borderWidth: 1,
                        cornerRadius: 12
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: isDark ? '#d1d5db' : '#6b7280',
                            font: { family: 'Inter', size: 12 },
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        },
                        grid: {
                            color: isDark ? '#374151' : '#f3f4f6',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: isDark ? '#d1d5db' : '#6b7280',
                            font: { family: 'Inter', size: 12 },
                            maxRotation: 45
                        },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Render Unemployment Rate Chart
    function renderUnemploymentChart() {
        const ctx = document.getElementById('unemploymentChart').getContext('2d');
        const isDark = document.documentElement.classList.contains('dark');
        
        const unemploymentData = selectedCountries.map(country => {
            const unemployment = economicData[country.code]['SL.UEM.TOTL.ZS'];
            return unemployment?.value || 0;
        });

        charts.unemployment = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: selectedCountries.map(c => c.name),
                datasets: [{
                    data: unemploymentData,
                    backgroundColor: selectedCountries.map((_, index) => getChartColor(index, 0.8)),
                    borderColor: isDark ? '#1f2937' : '#ffffff',
                    borderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: isDark ? '#f3f4f6' : '#374151',
                            font: { family: 'Inter', size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1f2937' : '#ffffff',
                        titleColor: isDark ? '#f3f4f6' : '#374151',
                        bodyColor: isDark ? '#d1d5db' : '#6b7280',
                        borderColor: isDark ? '#374151' : '#e5e7eb',
                        borderWidth: 1,
                        cornerRadius: 12,
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed.toFixed(1) + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    // Render Population Chart
    function renderPopulationChart() {
        const ctx = document.getElementById('populationChart').getContext('2d');
        const isDark = document.documentElement.classList.contains('dark');
        
        const populationData = selectedCountries.map(country => {
            const population = economicData[country.code]['SP.POP.TOTL'];
            return population?.value || 0;
        });

        charts.population = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: selectedCountries.map(c => c.name),
                datasets: [{
                    label: 'Population',
                    data: populationData,
                    backgroundColor: selectedCountries.map((_, index) => `rgba(99, 102, 241, 0.8)`),
                    borderColor: selectedCountries.map((_, index) => `rgba(99, 102, 241, 1)`),
                    borderWidth: 3,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1f2937' : '#ffffff',
                        titleColor: isDark ? '#f3f4f6' : '#374151',
                        bodyColor: isDark ? '#d1d5db' : '#6b7280',
                        borderColor: isDark ? '#374151' : '#e5e7eb',
                        borderWidth: 1,
                        cornerRadius: 12,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                if (value >= 1e9) return 'Population: ' + (value / 1e9).toFixed(2) + 'B';
                                if (value >= 1e6) return 'Population: ' + (value / 1e6).toFixed(1) + 'M';
                                if (value >= 1e3) return 'Population: ' + (value / 1e3).toFixed(0) + 'K';
                                return 'Population: ' + value.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: isDark ? '#d1d5db' : '#6b7280',
                            font: { family: 'Inter', size: 12 },
                            callback: function(value) {
                                if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
                                if (value >= 1e6) return (value / 1e6).toFixed(0) + 'M';
                                if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
                                return value.toLocaleString();
                            }
                        },
                        grid: {
                            color: isDark ? '#374151' : '#f3f4f6',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: isDark ? '#d1d5db' : '#6b7280',
                            font: { family: 'Inter', size: 12 },
                            maxRotation: 45
                        },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Render Exchange Rate Chart
    function renderExchangeChart() {
        const ctx = document.getElementById('exchangeChart').getContext('2d');
        const isDark = document.documentElement.classList.contains('dark');
        
        const exchangeData = selectedCountries.map(country => {
            const exchange = economicData[country.code]['PA.NUS.FCRF'];
            return exchange?.value || 0;
        });

        charts.exchange = new Chart(ctx, {
            type: 'line',
            data: {
                labels: selectedCountries.map(c => c.name),
                datasets: [{
                    label: 'Exchange Rate (LCU per USD)',
                    data: exchangeData,
                    borderColor: 'rgba(20, 184, 166, 1)',
                    backgroundColor: 'rgba(20, 184, 166, 0.1)',
                    borderWidth: 4,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(20, 184, 166, 1)',
                    pointBorderColor: isDark ? '#1f2937' : '#ffffff',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1f2937' : '#ffffff',
                        titleColor: isDark ? '#f3f4f6' : '#374151',
                        bodyColor: isDark ? '#d1d5db' : '#6b7280',
                        borderColor: isDark ? '#374151' : '#e5e7eb',
                        borderWidth: 1,
                        cornerRadius: 12,
                        callbacks: {
                            label: function(context) {
                                return 'Exchange Rate: ' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: isDark ? '#d1d5db' : '#6b7280',
                            font: { family: 'Inter', size: 12 }
                        },
                        grid: {
                            color: isDark ? '#374151' : '#f3f4f6',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: isDark ? '#d1d5db' : '#6b7280',
                            font: { family: 'Inter', size: 12 },
                            maxRotation: 45
                        },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Render tables
    function renderTables() {
        const tableHeaders = document.getElementById('tableHeaders');
        const tableBody = document.getElementById('tableBody');
        
        // Clear existing content
        tableHeaders.innerHTML = '';
        tableBody.innerHTML = '';
        
        // Create headers
        const headers = ['Indicator', ...selectedCountries.map(c => c.name)];
        headers.forEach(header => {
            const th = document.createElement('th');
            th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider';
            th.textContent = header;
            tableHeaders.appendChild(th);
        });
        
        // Create rows for each indicator
        Object.entries(INDICATORS).forEach(([code, info]) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';
            
            // Indicator name cell
            const nameCell = document.createElement('td');
            nameCell.className = 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white';
            nameCell.textContent = info.name;
            row.appendChild(nameCell);
            
            // Data cells for each country
            selectedCountries.forEach(country => {
                const cell = document.createElement('td');
                cell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400';
                
                const data = economicData[country.code][code];
                if (data && data.value !== null) {
                    cell.textContent = formatValue(data.value, info.format);
                    cell.title = `Year: ${data.year}`;
                } else {
                    cell.textContent = 'N/A';
                    cell.className += ' text-gray-400 dark:text-gray-600';
                }
                
                row.appendChild(cell);
            });
            
            tableBody.appendChild(row);
        });

        // Add trade balance row
        const tradeBalanceRow = document.createElement('tr');
        tradeBalanceRow.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-blue-50 dark:bg-blue-900/20';
        
        const tradeNameCell = document.createElement('td');
        tradeNameCell.className = 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white';
        tradeNameCell.textContent = 'Trade Balance (Exports - Imports)';
        tradeBalanceRow.appendChild(tradeNameCell);
        
        selectedCountries.forEach(country => {
            const cell = document.createElement('td');
            cell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400';
            
            const tradeBalance = calculateTradeBalance(country);
            if (tradeBalance !== 0) {
                cell.textContent = formatValue(tradeBalance, 'currency');
                cell.className += tradeBalance > 0 ? ' text-green-600 dark:text-green-400' : ' text-red-600 dark:text-red-400';
            } else {
                cell.textContent = 'N/A';
                cell.className += ' text-gray-400 dark:text-gray-600';
            }
            
            tradeBalanceRow.appendChild(cell);
        });
        
        tableBody.appendChild(tradeBalanceRow);
    }

    // Utility functions
    function getChartColor(index, alpha = 1) {
        const colors = [
            `rgba(59, 130, 246, ${alpha})`,   // Blue
            `rgba(34, 197, 94, ${alpha})`,    // Green
            `rgba(239, 68, 68, ${alpha})`,    // Red
            `rgba(168, 85, 247, ${alpha})`,   // Purple
            `rgba(245, 158, 11, ${alpha})`,   // Orange
            `rgba(236, 72, 153, ${alpha})`,   // Pink
            `rgba(20, 184, 166, ${alpha})`,   // Teal
            `rgba(99, 102, 241, ${alpha})`    // Indigo
        ];
        return colors[index % colors.length];
    }

    // Calculate trade balance
    function calculateTradeBalance(country) {
        const exports = economicData[country.code]['NE.EXP.GNFS.CD']?.value || 0;
        const imports = economicData[country.code]['NE.IMP.GNFS.CD']?.value || 0;
        return exports - imports;
    }

    // Helper function for time series chart options
    function getTimeSeriesChartOptions(isDark, label, valueFormatter) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: {
                    labels: {
                        color: isDark ? '#f3f4f6' : '#374151',
                        font: { family: 'Inter', size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    titleColor: isDark ? '#f3f4f6' : '#374151',
                    bodyColor: isDark ? '#d1d5db' : '#6b7280',
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    borderWidth: 1,
                    cornerRadius: 12,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return context.dataset.label + ': ' + valueFormatter(value);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: isDark ? '#d1d5db' : '#6b7280',
                        font: { family: 'Inter', size: 12 },
                        callback: valueFormatter
                    },
                    grid: {
                        color: isDark ? '#374151' : '#f3f4f6',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: isDark ? '#d1d5db' : '#6b7280',
                        font: { family: 'Inter', size: 12 },
                        maxRotation: 45
                    },
                    grid: {
                        color: isDark ? '#374151' : '#f3f4f6',
                        drawBorder: false
                    }
                }
            }
        };
    }

    // Helper function for bar chart options
    function getBarChartOptions(isDark, label, valueFormatter) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    titleColor: isDark ? '#f3f4f6' : '#374151',
                    bodyColor: isDark ? '#d1d5db' : '#6b7280',
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    borderWidth: 1,
                    cornerRadius: 12,
                    callbacks: {
                        label: function(context) {
                            return label + ': ' + valueFormatter(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: isDark ? '#d1d5db' : '#6b7280',
                        font: { family: 'Inter', size: 12 },
                        callback: valueFormatter
                    },
                    grid: {
                        color: isDark ? '#374151' : '#f3f4f6',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: isDark ? '#d1d5db' : '#6b7280',
                        font: { family: 'Inter', size: 12 },
                        maxRotation: 45
                    },
                    grid: { display: false }
                }
            }
        };
    }

    // Helper function for pie/doughnut chart options
    function getPieChartOptions(isDark, valueFormatter) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: isDark ? '#f3f4f6' : '#374151',
                        font: { family: 'Inter', size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    titleColor: isDark ? '#f3f4f6' : '#374151',
                    bodyColor: isDark ? '#d1d5db' : '#6b7280',
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    borderWidth: 1,
                    cornerRadius: 12,
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + valueFormatter(context.parsed);
                        }
                    }
                }
            }
        };
    }

    function formatValue(value, format) {
        if (value === null || value === undefined) return 'N/A';
        
        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    notation: 'compact',
                    maximumFractionDigits: 1
                }).format(value);
            case 'percentage':
                return value.toFixed(2) + '%';
            case 'decimal':
                return value.toFixed(2);
            case 'number':
                if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
                if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
                if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
                return value.toLocaleString();
            default:
                return value.toLocaleString();
        }
    }

    function destroyExistingCharts() {
        Object.values(charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        charts = {};
    }

    // View switching
    function switchView(view) {
        currentView = view;
        
        if (view === 'charts') {
            chartsView.classList.remove('hidden');
            tablesView.classList.add('hidden');
            chartsViewBtn.className = 'px-6 py-3 bg-blue-600 text-white rounded-lg font-medium transition-colors';
            tablesViewBtn.className = 'px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors';
            renderCharts();
        } else {
            chartsView.classList.add('hidden');
            tablesView.classList.remove('hidden');
            tablesViewBtn.className = 'px-6 py-3 bg-blue-600 text-white rounded-lg font-medium transition-colors';
            chartsViewBtn.className = 'px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors';
            renderTables();
        }
    }

    // UI Helper functions
    function showLoading() {
        loadingSpinner.classList.remove('hidden');
    }

    function hideLoading() {
        loadingSpinner.classList.add('hidden');
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        setTimeout(() => {
            hideError();
        }, 5000);
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    function showDataContainer() {
        dataContainer.classList.remove('hidden');
        viewToggle.classList.remove('hidden');
        emptyState.classList.add('hidden');
    }

    function hideDataContainer() {
        dataContainer.classList.add('hidden');
        viewToggle.classList.add('hidden');
        emptyState.classList.remove('hidden');
        destroyExistingCharts();
    }

    // Dark mode setup
    function setupDarkMode() {
        // Check for saved theme preference - default to light theme
        const savedTheme = localStorage.getItem('theme');
        
        // Only apply dark mode if explicitly saved as 'dark'
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            // Ensure light theme is default
            document.documentElement.classList.remove('dark');
            if (!savedTheme) {
                localStorage.setItem('theme', 'light');
            }
        }

        // Update toggle button icon
        updateDarkModeIcon();

        darkModeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.contains('dark');
            
            if (isDark) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            }
            
            // Update icon with smooth transition
            updateDarkModeIcon();
            
            // Re-render charts with new theme colors
            if (selectedCountries.length > 0 && currentView === 'charts') {
                setTimeout(() => renderCharts(), 150);
            }
        });

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                if (e.matches) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                updateDarkModeIcon();
                if (selectedCountries.length > 0 && currentView === 'charts') {
                    setTimeout(() => renderCharts(), 150);
                }
            }
        });
    }

    // Update dark mode toggle icon
    function updateDarkModeIcon() {
        const isDark = document.documentElement.classList.contains('dark');
        const moonIcon = darkModeToggle.querySelector('.fa-moon');
        const sunIcon = darkModeToggle.querySelector('.fa-sun');
        
        if (isDark) {
            moonIcon.classList.add('hidden');
            sunIcon.classList.remove('hidden');
        } else {
            moonIcon.classList.remove('hidden');
            sunIcon.classList.add('hidden');
        }
    }

    // Initialize the application
    init();
});
