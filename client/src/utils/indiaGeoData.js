/**
 * Scalable Indian Geographic Dataset
 * Covers all 28 States and 8 Union Territories of India with their major districts
 * Used for dynamic state-district cascading dropdowns and civic geo-intelligence
 */

export const INDIA_GEO_DATA = [
  // 28 States
  {
    state: 'Andhra Pradesh',
    type: 'State',
    center: [15.9129, 79.7400],
    districts: [
      'Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna',
      'Kurnool', 'Nellore', 'Prakasam', 'Srikakulam', 'Visakhapatnam',
      'Vizianagaram', 'West Godavari', 'YSR Kadapa'
    ]
  },
  {
    state: 'Arunachal Pradesh',
    type: 'State',
    center: [28.2180, 94.7278],
    districts: [
      'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Kamle',
      'Kra Daadi', 'Kurung Kumey', 'Lepa Rada', 'Lohit', 'Longding',
      'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri', 'Namsai',
      'Pakke Kessang', 'Papum Pare', 'Shi Yomi', 'Siang', 'Tawang',
      'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'
    ]
  },
  {
    state: 'Assam',
    type: 'State',
    center: [26.2006, 92.9376],
    districts: [
      'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo',
      'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao',
      'Goalpara', 'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup',
      'Kamrup Metropolitan (Guwahati)', 'Karbi Anglong', 'Karimganj',
      'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari',
      'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tinsukia', 'Udalguri'
    ]
  },
  {
    state: 'Bihar',
    type: 'State',
    center: [25.0961, 85.3131],
    districts: [
      'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur',
      'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj',
      'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj',
      'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur',
      'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa',
      'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan',
      'Supaul', 'Vaishali', 'West Champaran'
    ]
  },
  {
    state: 'Chhattisgarh',
    type: 'State',
    center: [21.2787, 81.8661],
    districts: [
      'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur',
      'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Janjgir-Champa',
      'Jashpur', 'Kabirdham', 'Kanker', 'Kondagaon', 'Korba', 'Koriya',
      'Mahasamund', 'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon',
      'Sukma', 'Surajpur', 'Surguja'
    ]
  },
  {
    state: 'Goa',
    type: 'State',
    center: [15.2993, 74.1240],
    districts: ['North Goa (Panaji)', 'South Goa (Margao)']
  },
  {
    state: 'Gujarat',
    type: 'State',
    center: [22.2587, 71.1924],
    districts: [
      'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch',
      'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka',
      'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch',
      'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal',
      'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar',
      'Tapi', 'Vadodara', 'Valsad'
    ]
  },
  {
    state: 'Haryana',
    type: 'State',
    center: [29.0588, 76.0856],
    districts: [
      'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad',
      'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal',
      'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula',
      'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'
    ]
  },
  {
    state: 'Himachal Pradesh',
    type: 'State',
    center: [31.1048, 77.1734],
    districts: [
      'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu',
      'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'
    ]
  },
  {
    state: 'Jharkhand',
    type: 'State',
    center: [23.6102, 85.2799],
    districts: [
      'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum (Jamshedpur)',
      'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara',
      'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu',
      'Ramgarh', 'Ranchi', 'Sahebganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'
    ]
  },
  {
    state: 'Karnataka',
    type: 'State',
    center: [15.3173, 75.7139],
    districts: [
      'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
      'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga',
      'Dakshina Kannada (Mangaluru)', 'Davanagere', 'Dharwad (Hubballi)', 'Gadag',
      'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya',
      'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi',
      'Uttara Kannada', 'Vijayapura', 'Yadgir'
    ]
  },
  {
    state: 'Kerala',
    type: 'State',
    center: [10.8505, 76.2711],
    districts: [
      'Alappuzha', 'Ernakulam (Kochi)', 'Idukki', 'Kannur', 'Kasaragod',
      'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad',
      'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'
    ]
  },
  {
    state: 'Madhya Pradesh',
    type: 'State',
    center: [22.9734, 78.6569],
    districts: [
      'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani',
      'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara',
      'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior',
      'Harda', 'Hoshangabad (Narmadapuram)', 'Indore', 'Jabalpur', 'Jhabua',
      'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena',
      'Narsinghpur', 'Neemuch', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam',
      'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur',
      'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain',
      'Umaria', 'Vidisha'
    ]
  },
  {
    state: 'Maharashtra',
    type: 'State',
    center: [19.7515, 75.7139],
    districts: [
      'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad (Chhatrapati Sambhaji Nagar)',
      'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli',
      'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur',
      'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar',
      'Nashik', 'Osmanabad (Dharashiv)', 'Palghar', 'Parbhani', 'Pune',
      'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur',
      'Thane', 'Wardha', 'Washim', 'Yavatmal'
    ]
  },
  {
    state: 'Manipur',
    type: 'State',
    center: [24.6637, 93.9063],
    districts: [
      'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West',
      'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl',
      'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'
    ]
  },
  {
    state: 'Meghalaya',
    type: 'State',
    center: [25.4670, 91.3662],
    districts: [
      'East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills (Shillong)',
      'North Garo Hills', 'Ribhoi', 'South Garo Hills', 'South West Garo Hills',
      'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'
    ]
  },
  {
    state: 'Mizoram',
    type: 'State',
    center: [23.1645, 92.9376],
    districts: [
      'Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib', 'Lawngtlai',
      'Lunglei', 'Mamit', 'Saiha', 'Saitual', 'Serchhip'
    ]
  },
  {
    state: 'Nagaland',
    type: 'State',
    center: [26.1584, 94.5624],
    districts: [
      'Chumoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung',
      'Mon', 'Niuland', 'Noklak', 'Peren', 'Phek', 'Shamator', 'Tseminyu',
      'Tuensang', 'Wokha', 'Zunheboto'
    ]
  },
  {
    state: 'Odisha',
    type: 'State',
    center: [20.9517, 85.0985],
    districts: [
      'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh',
      'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur',
      'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara',
      'Kendujhar (Keonjhar)', 'Khordha (Bhubaneswar)', 'Koraput', 'Malkangiri',
      'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada',
      'Sambalpur', 'Subarnapur (Sonepur)', 'Sundargarh'
    ]
  },
  {
    state: 'Punjab',
    type: 'State',
    center: [31.1471, 75.3412],
    districts: [
      'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib',
      'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar',
      'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga', 'Muktsar',
      'Pathankot', 'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar (Mohali)',
      'Sangrur', 'Shahid Bhagat Singh Nagar (Nawanshahr)', 'Tarn Taran'
    ]
  },
  {
    state: 'Rajasthan',
    type: 'State',
    center: [27.0238, 74.2179],
    districts: [
      'Kota', 'Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur',
      'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa',
      'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore',
      'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Nagaur', 'Pali',
      'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi',
      'Sri Ganganagar', 'Tonk', 'Udaipur'
    ]
  },
  {
    state: 'Sikkim',
    type: 'State',
    center: [27.5330, 88.5122],
    districts: [
      'Gangtok', 'Gyalshing', 'Mangan', 'Namchi', 'Pakyong', 'Soreng'
    ]
  },
  {
    state: 'Tamil Nadu',
    type: 'State',
    center: [11.1271, 78.6569],
    districts: [
      'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
      'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram',
      'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam',
      'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram',
      'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni',
      'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur',
      'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'
    ]
  },
  {
    state: 'Telangana',
    type: 'State',
    center: [18.1124, 79.0193],
    districts: [
      'Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon',
      'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar',
      'Khammam', 'Komaram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar',
      'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool',
      'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli',
      'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet',
      'Vikarabad', 'Wanaparthy', 'Warangal', 'Hanamkonda', 'Yadadri Bhuvanagiri'
    ]
  },
  {
    state: 'Tripura',
    type: 'State',
    center: [23.9408, 91.9882],
    districts: [
      'Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala',
      'South Tripura', 'Unakoti', 'West Tripura (Agartala)'
    ]
  },
  {
    state: 'Uttar Pradesh',
    type: 'State',
    center: [26.8467, 80.9462],
    districts: [
      'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya',
      'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur',
      'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor',
      'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah',
      'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar (Noida)',
      'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur',
      'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj',
      'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri (Lakhimpur)',
      'Kushinagar', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri',
      'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar',
      'Pilibhit', 'Pratapgarh', 'Prayagraj (Allahabad)', 'Raebareli', 'Rampur',
      'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli',
      'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur',
      'Unnao', 'Varanasi'
    ]
  },
  {
    state: 'Uttarakhand',
    type: 'State',
    center: [30.0668, 79.0193],
    districts: [
      'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar',
      'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal',
      'Udham Singh Nagar', 'Uttarkashi'
    ]
  },
  {
    state: 'West Bengal',
    type: 'State',
    center: [22.9868, 87.8550],
    districts: [
      'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur',
      'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong',
      'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas',
      'Paschim Bardhaman (Durgapur/Asansol)', 'Paschim Medinipur',
      'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas',
      'Uttar Dinajpur'
    ]
  },

  // 8 Union Territories
  {
    state: 'Andaman and Nicobar Islands',
    type: 'Union Territory',
    center: [11.7401, 92.6586],
    districts: ['Nicobar', 'North and Middle Andaman', 'South Andaman (Port Blair)']
  },
  {
    state: 'Chandigarh',
    type: 'Union Territory',
    center: [30.7333, 76.7794],
    districts: ['Chandigarh']
  },
  {
    state: 'Dadra and Nagar Haveli and Daman and Diu',
    type: 'Union Territory',
    center: [20.4283, 72.8397],
    districts: ['Dadra and Nagar Haveli (Silvassa)', 'Daman', 'Diu']
  },
  {
    state: 'Delhi',
    type: 'Union Territory',
    center: [28.7041, 77.1025],
    districts: [
      'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi',
      'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi',
      'South East Delhi', 'South West Delhi', 'West Delhi'
    ]
  },
  {
    state: 'Jammu and Kashmir',
    type: 'Union Territory',
    center: [33.7782, 76.5762],
    districts: [
      'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal',
      'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama',
      'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'
    ]
  },
  {
    state: 'Ladakh',
    type: 'Union Territory',
    center: [34.1526, 77.5771],
    districts: ['Kargil', 'Leh']
  },
  {
    state: 'Lakshadweep',
    type: 'Union Territory',
    center: [10.5667, 72.6417],
    districts: ['Lakshadweep (Kavaratti)']
  },
  {
    state: 'Puducherry',
    type: 'Union Territory',
    center: [11.9416, 79.8083],
    districts: ['Karaikal', 'Mahe', 'Puducherry', 'Yanam']
  }
];

export const getAllStates = () => INDIA_GEO_DATA.map((entry) => entry.state);

export const getDistrictsForState = (stateName) => {
  if (!stateName) return [];
  const found = INDIA_GEO_DATA.find(
    (item) => item.state.toLowerCase() === stateName.trim().toLowerCase()
  );
  return found ? found.districts : [];
};

export const getStateCenter = (stateName) => {
  if (!stateName) return [20.5937, 78.9629]; // Default India center
  const found = INDIA_GEO_DATA.find(
    (item) => item.state.toLowerCase() === stateName.trim().toLowerCase()
  );
  return found?.center || [20.5937, 78.9629];
};

export const isValidIndianState = (stateName) => {
  if (!stateName) return false;
  return INDIA_GEO_DATA.some(
    (entry) => entry.state.toLowerCase() === stateName.trim().toLowerCase()
  );
};
