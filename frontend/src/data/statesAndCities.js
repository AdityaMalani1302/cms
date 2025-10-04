// Indian States and Cities data for address dropdowns
export const statesAndCities = {
  'Maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 
    'Bhiwandi', 'Amravati', 'Nanded', 'Kolhapur', 'Ulhasnagar', 'Sangli', 
    'Malegaon', 'Jalgaon', 'Akola', 'Latur', 'Dhule', 'Ahmednagar', 'Chandrapur'
  ],
  'Karnataka': [
    'Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga', 
    'Davanagere', 'Bellary', 'Bijapur', 'Shimoga', 'Tumkur', 'Raichur', 
    'Bidar', 'Hospet', 'Hassan', 'Gadag', 'Udupi', 'Robertsonpet', 'Bhadravati', 'Chitradurga'
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli',
    'Tiruppur', 'Vellore', 'Thoothukudi', 'Nagercoil', 'Thanjavur', 'Dindigul',
    'Kumbakonam', 'Erode', 'Tiruvannamalai', 'Pollachi', 'Rajapalayam', 'Sivakasi',
    'Pudukkottai', 'Neyveli'
  ],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar',
    'Junagadh', 'Gandhidham', 'Nadiad', 'Morbi', 'Surendranagar', 'Bharuch',
    'Vapi', 'Navsari', 'Veraval', 'Porbandar', 'Godhra', 'Bhuj', 'Anand', 'Modasa'
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara',
    'Alwar', 'Bharatpur', 'Sikar', 'Pali', 'Sri Ganganagar', 'Kishangarh',
    'Baran', 'Dhaulpur', 'Tonk', 'Beawar', 'Hanumangarh', 'Churu', 'Sawai Madhopur'
  ],
  'West Bengal': [
    'Kolkata', 'Asansol', 'Siliguri', 'Durgapur', 'Bardhaman', 'Malda',
    'Baharampur', 'Habra', 'Kharagpur', 'Shantipur', 'Dankuni', 'Dhulian',
    'Raniganj', 'Haldia', 'Raiganj', 'Krishnanagar', 'Nabadwip', 'Medinipur',
    'Jalpaiguri', 'Balurghat'
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Allahabad',
    'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Noida',
    'Firozabad', 'Jhansi', 'Muzaffarnagar', 'Mathura', 'Rampur', 'Shahjahanpur',
    'Farrukhabad'
  ],
  'Telangana': [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam',
    'Mahabubnagar', 'Nalgonda', 'Adilabad', 'Suryapet', 'Miryalaguda', 'Jagtial',
    'Mancherial', 'Nirmal', 'Kothagudem', 'Bodhan', 'Sangareddy', 'Metpally',
    'Zahirabad', 'Medak'
  ],
  'Punjab': [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali',
    'Firozpur', 'Batala', 'Pathankot', 'Moga', 'Abohar', 'Malerkotla',
    'Khanna', 'Phagwara', 'Muktsar', 'Barnala', 'Rajpura', 'Hoshiarpur',
    'Kapurthala', 'Faridkot'
  ],
  'Haryana': [
    'Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak',
    'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh',
    'Jind', 'Thanesar', 'Kaithal', 'Palwal', 'Rewari', 'Hansi', 'Narnaul'
  ]
};

// Get list of states
export const getStates = () => {
  return Object.keys(statesAndCities).sort();
};

// Get cities for a specific state
export const getCitiesForState = (state) => {
  return statesAndCities[state] || [];
};

// Check if a state exists
export const isValidState = (state) => {
  return Object.keys(statesAndCities).includes(state);
};

// Check if a city exists for a given state
export const isValidCityForState = (city, state) => {
  const cities = getCitiesForState(state);
  return cities.includes(city);
};