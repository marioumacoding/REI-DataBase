export interface Property {
  id: number;
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  mailing_address?: string;
  mailing_city?: string;
  mailing_state?: string;
  mailing_zip?: string;
  client_name: string;
  created_at: string;
  phone_1?: string;
  type_1?: string;
  phone_2?: string;
  type_2?: string;
  phone_3?: string;
  type_3?: string;
  email_1?: string;
  email_2?: string;
  email_3?: string;
  wrong_1?: boolean;
  wrong_2?: boolean;
  wrong_3?: boolean;
  last_seen_1?: string;
  last_seen_2?: string;
  last_seen_3?: string;
}

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID",
  "IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS",
  "MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
  "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV",
  "WI","WY"
];
