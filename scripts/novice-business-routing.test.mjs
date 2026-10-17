import test from 'node:test';import assert from 'node:assert/strict';import {entryDestination} from '../transaction-discovery.js';import {activityEmirate} from '../activity-discovery.js';
const cases=[
  {
    "locale": "ar",
    "query": "عايز أفتح كافتيريا في دبي",
    "emirate": "دبي"
  },
  {
    "locale": "en",
    "query": "I want to open a cafeteria in Dubai",
    "emirate": "دبي"
  },
  {
    "locale": "ar",
    "query": "أريد إنشاء مطعم في دبي",
    "emirate": "دبي"
  },
  {
    "locale": "en",
    "query": "I need to start a restaurant in Dubai",
    "emirate": "دبي"
  },
  {
    "locale": "ar",
    "query": "عايز أفتح كافتيريا في أبوظبي",
    "emirate": "أبوظبي"
  },
  {
    "locale": "en",
    "query": "I want to open a cafeteria in Abu Dhabi",
    "emirate": "أبوظبي"
  },
  {
    "locale": "ar",
    "query": "أريد إنشاء مطعم في أبوظبي",
    "emirate": "أبوظبي"
  },
  {
    "locale": "en",
    "query": "I need to start a restaurant in Abu Dhabi",
    "emirate": "أبوظبي"
  },
  {
    "locale": "ar",
    "query": "عايز أفتح كافتيريا في الشارقة",
    "emirate": "الشارقة"
  },
  {
    "locale": "en",
    "query": "I want to open a cafeteria in Sharjah",
    "emirate": "الشارقة"
  },
  {
    "locale": "ar",
    "query": "أريد إنشاء مطعم في الشارقة",
    "emirate": "الشارقة"
  },
  {
    "locale": "en",
    "query": "I need to start a restaurant in Sharjah",
    "emirate": "الشارقة"
  },
  {
    "locale": "ar",
    "query": "عايز أفتح كافتيريا في عجمان",
    "emirate": "عجمان"
  },
  {
    "locale": "en",
    "query": "I want to open a cafeteria in Ajman",
    "emirate": "عجمان"
  },
  {
    "locale": "ar",
    "query": "أريد إنشاء مطعم في عجمان",
    "emirate": "عجمان"
  },
  {
    "locale": "en",
    "query": "I need to start a restaurant in Ajman",
    "emirate": "عجمان"
  },
  {
    "locale": "ar",
    "query": "عايز أفتح كافتيريا في رأس الخيمة",
    "emirate": "رأس الخيمة"
  },
  {
    "locale": "en",
    "query": "I want to open a cafeteria in Ras Al Khaimah",
    "emirate": "رأس الخيمة"
  },
  {
    "locale": "ar",
    "query": "أريد إنشاء مطعم في رأس الخيمة",
    "emirate": "رأس الخيمة"
  },
  {
    "locale": "en",
    "query": "I need to start a restaurant in Ras Al Khaimah",
    "emirate": "رأس الخيمة"
  },
  {
    "locale": "ar",
    "query": "عايز أفتح كافتيريا في الفجيرة",
    "emirate": "الفجيرة"
  },
  {
    "locale": "en",
    "query": "I want to open a cafeteria in Fujairah",
    "emirate": "الفجيرة"
  },
  {
    "locale": "ar",
    "query": "أريد إنشاء مطعم في الفجيرة",
    "emirate": "الفجيرة"
  },
  {
    "locale": "en",
    "query": "I need to start a restaurant in Fujairah",
    "emirate": "الفجيرة"
  },
  {
    "locale": "ar",
    "query": "عايز أفتح كافتيريا في أم القيوين",
    "emirate": "أم القيوين"
  },
  {
    "locale": "en",
    "query": "I want to open a cafeteria in Umm Al Quwain",
    "emirate": "أم القيوين"
  },
  {
    "locale": "ar",
    "query": "أريد إنشاء مطعم في أم القيوين",
    "emirate": "أم القيوين"
  },
  {
    "locale": "en",
    "query": "I need to start a restaurant in Umm Al Quwain",
    "emirate": "أم القيوين"
  },
  {
    "locale": "ar",
    "query": "أبغي أفتح متجر في دبي",
    "emirate": "دبي"
  },
  {
    "locale": "en",
    "query": "How do I set up a grocery shop in Dubai?",
    "emirate": "دبي"
  },
  {
    "locale": "ar",
    "query": "عايز أفتح كافتيريا",
    "emirate": ""
  },
  {
    "locale": "en",
    "query": "I want to open a salon",
    "emirate": ""
  }
];
test('32 concrete beginner business ideas reach existing activity discovery with correct jurisdiction',()=>{for(const c of cases){assert.equal(entryDestination(c.query),'business-activities',c.query);assert.equal(activityEmirate(c.query)||'',c.emirate,c.query);}});
test('amendment, renewal and unrelated journeys keep their existing entry paths',()=>{for(const q of ['عايز أضيف نشاط لمطعمي','عايز أجدد رخصة محل','I want to renew my restaurant licence','I need to add activity to my shop','عايز ألغي رخصة محل','عايز أفتح شركة في الشارقة','عايز أجيب زوجتي دبي'])assert.equal(entryDestination(q),'ai',q);for(const q of ['تجديد إقامة','Ejari','Golden Residence','إضافة نشاط'])assert.equal(entryDestination(q),'services',q);});
