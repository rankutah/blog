---
title:     "{{ replace .Name "-" " " | title }}"
date:      {{ .Date }}
summary:   ""            # Brief excerpt or description for previews
tags:      []            # e.g. ["local", "seo", "event"]
type:      "post"        # Use "event" later when it’s an event
eventDate: ""            # Leave blank unless this is an event
location:
  name:    ""            # Venue name (for events)
  address: ""
  city:    ""
  region:  ""
  postalCode: ""
  country: ""
image:     ""            # Featured image URL (e.g. "/uploads/xyz.jpg")
organizer:
  name:    ""            # Only if you want to name an organizer
price:     ""            # Only if ticketed
draft:     true
---
Write your full Spotlight content here...
