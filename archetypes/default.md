+++
# Image filename placed in the same directory as the post (optional)
image: ""

# Date of the event in YYYY-MM-DD format
eventDate: "" 

# Time of the event in ISO 8601 format (e.g., 2025-06-15T19:00:00)
eventDateTime: ""

# Location details for the event (all optional but recommended)
location:
  name: ""         
  address: ""      
  city: ""         
  region: ""       
  postalCode: ""   
  country: ""      

# Organizer details
organizer:
  name: ""           
  contactEmail: ""   
  contactPhone: ""   
  url: ""            

# Price
price: ""

# Auto Generated (Leave alone)
draft: false
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}

+++