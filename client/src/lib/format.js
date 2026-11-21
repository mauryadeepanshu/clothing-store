export const inr = (n) => {
  const v = Math.round(Number(n || 0) * 100) / 100;
  const frac = Number.isInteger(v) ? 0 : 2;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
};

export const date = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const dateTime = (d) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const GENDERS = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'unisex', label: 'Unisex' },
];

export const STATUS_STYLE = {
  'Pending Payment': 'bg-mist text-stone',
  Placed: 'bg-sand/60 text-ink',
  Confirmed: 'bg-sand text-ink',
  Shipped: 'bg-ink/80 text-paper',
  'Out for Delivery': 'bg-ink/90 text-paper',
  Delivered: 'bg-ink text-paper',
  Cancelled: 'bg-sale/10 text-sale',
};

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];
