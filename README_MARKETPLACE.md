# 🏪 מערכת השוק הקהילתי - Taste of the Caucasus

מערכת שוק מקוונת מלאה עבור מאכלים מסורתיים קווקזיים/ג'והוריים.

---

## 🎯 תכונות עיקריות

### 1. 📦 מערכת הזמנות מלאה
- **יצירת הזמנות** מסל קניות
- **מעקב סטטוס** בזמן אמת: ממתין → אושר → מוכן → הושלם
- **התראות אוטומטיות** למוכרים ולקוחות
- **ניהול הזמנות** בדשבורד המוכר
- **היסטוריית הזמנות** מלאה

### 2. ⏰ שעות פתיחה חכמות
- **סטטוס בזמן אמת** - פתוח/סגור על בסיס השעה הנוכחית
- **הודעות ידידותיות**:
  - "פתוח עד 21:00"
  - "סגור - נפתח ב-09:00"
  - "פתוח - נסגר בעוד 30 דקות"
- **סגירות מיוחדות** (חגים, אירועים)
- **אימות זמני איסוף** אוטומטי
- **הצעת סלוטים זמינים** ב-15 דקות
- **מרקרים צבעוניים במפה** (ירוק=פתוח, אדום=סגור)

### 3. 🔔 מערכת התראות
- **התראות בזמן אמת** עם polling כל 30 שניות
- **תג ספירה** של התראות שלא נקראו
- **התראות למוכרים**:
  - הזמנה חדשה התקבלה
  - ביקורת חדשה נכתבה
- **התראות ללקוחות**:
  - הזמנה אושרה
  - הזמנה מוכנה לאיסוף
  - הזמנה הושלמה
  - הזמנה בוטלה
- **סמן כנקרא** פרטנית או הכל ביחד
- **אייקונים ייחודיים** לכל סוג התראה

### 4. 📊 סטטיסטיקות מתקדמות
- **כרטיסי סקירה**:
  - סה"כ הזמנות
  - הזמנות שהושלמו
  - סה"כ הכנסות (₪)
  - ממוצע הזמנה
  - לקוחות ייחודיים
- **גרף הזמנות יומי** - 7 ימים אחרונים
- **טבלת מנות פופולריות** עם דירוג (זהב, כסף, ארד)
- **עיצוב צבעוני וויזואלי**

### 5. 📸 מערכת העלאת תמונות
- **קומפוננט לשימוש חוזר** `<ImageUpload />`
- **Drag & Drop** או לחיצה להעלאה
- **תצוגה מקדימה** עם hover-to-remove
- **תמיכה בפורמטים**: JPG, PNG, WebP, GIF
- **הגבלת גודל**: עד 15MB
- **אינטגרציה**:
  - לוגו מוכר
  - תמונת about
  - תמונות מנות (בעתיד)

### 6. 🗺️ גיאוקודינג אוטומטי
- **חיפוש כתובת אוטומטי** תוך כדי הקלדה
- **Debouncing** - 1.5 שניות אחרי סיום הקלדה
- **כפתור גיאוקודינג ידני**
- **שימוש ב-Nominatim API** (OpenStreetMap)
- **הגבלה לישראל** בלבד
- **הצגת קואורדינטות** שנמצאו
- **סימון במפה** אוטומטי

---

## 🏗️ ארכיטקטורה

### Backend (Node.js + Express)

**Routes: `server/routes/marketplace.js`** (1200+ שורות)

**Endpoints:**
- `GET /api/marketplace/vendors` - רשימת מוכרים (עם radius, search)
- `GET /api/marketplace/vendors/:slug` - פרטי מוכר
- `POST /api/marketplace/vendors` - יצירת מוכר חדש
- `PUT /api/marketplace/vendors/:id` - עדכון מוכר
- `DELETE /api/marketplace/vendors/:id` - מחיקת מוכר
- `POST /api/marketplace/vendors/:id/menu` - הוספת מנה
- `PUT /api/marketplace/menu/:id` - עדכון מנה
- `DELETE /api/marketplace/menu/:id` - מחיקת מנה
- `POST /api/marketplace/vendors/:id/hours` - הגדרת שעות
- `POST /api/marketplace/vendors/:id/closures` - הוספת סגירה
- `POST /api/marketplace/vendors/:id/updates` - פרסום עדכון
- `GET /api/marketplace/vendors/:id/reviews` - ביקורות
- `POST /api/marketplace/vendors/:id/reviews` - כתיבת ביקורת
- `POST /api/marketplace/cart` - הוספה לסל
- `GET /api/marketplace/cart` - קבלת סל
- `DELETE /api/marketplace/cart/:id` - הסרה מסל
- `POST /api/marketplace/orders` - יצירת הזמנה
- `GET /api/marketplace/orders` - הזמנות המשתמש
- `GET /api/marketplace/vendors/:id/orders` - הזמנות המוכר
- `PUT /api/marketplace/orders/:id` - עדכון סטטוס הזמנה
- `GET /api/marketplace/notifications` - התראות
- `PUT /api/marketplace/notifications/:id/read` - סמן כנקרא
- `PUT /api/marketplace/notifications/read-all` - סמן הכל
- `GET /api/marketplace/vendors/:id/statistics` - סטטיסטיקות

**Admin Endpoints:**
- `PUT /api/marketplace/admin/vendors/:id/status` - אישור/השעיה
- `GET /api/marketplace/admin/reports` - דוחות קהילתיים
- `PUT /api/marketplace/admin/reports/:id` - טיפול בדוח

### Database Schema

**טבלאות:**
1. `marketplace_vendors` - מוכרים
2. `marketplace_menu_items` - תפריט
3. `marketplace_hours` - שעות פתיחה
4. `marketplace_closures` - סגירות מיוחדות
5. `marketplace_reviews` - ביקורות
6. `marketplace_updates` - עדכונים/מבצעים
7. `marketplace_reports` - דוחות קהילתיים
8. `marketplace_cart_items` - סל קניות
9. `marketplace_vendor_stats` - סטטיסטיקות (denormalized)
10. `marketplace_orders` - הזמנות
11. `marketplace_order_items` - פריטי הזמנה
12. `marketplace_notifications` - התראות
13. `marketplace_order_stats` - view לסטטיסטיקות

**Features:**
- Haversine distance calculation
- Soundex for phonetic search
- Full-text search on names and descriptions
- Composite indexes for performance
- Foreign keys with CASCADE
- Default hours stored procedure

### Frontend (React + TypeScript)

**עמודים:**
- `MarketplacePage.tsx` - עמוד ראשי עם מפה ורשימה
- `VendorDashboard.tsx` - דשבורד מוכר מלא
- `AdminMarketplacePanel.tsx` - פאנל ניהול

**קומפוננטים:**
- `VendorCard.tsx` - כרטיס מוכר ברשימה
- `VendorMap.tsx` - מפה עם markers
- `VendorDetailsModal.tsx` - מודל פרטי מוכר (4 טאבים)
- `ShoppingCart.tsx` - סל קניות
- `BecomeVendorWizard.tsx` - אשף יצירת מוכר (3 שלבים)
- `NotificationBell.tsx` - פעמון התראות
- `ImageUpload.tsx` - העלאת תמונות

**Utilities:**
- `marketplaceHelpers.ts` - לוגיקת שעות פתיחה
- `geocoding.ts` - גיאוקודינג עם Nominatim

**Services:**
- `marketplaceService.ts` - Type-safe API client

---

## 📦 תלויות

### Backend
```json
{
  "express": "^4.x",
  "mysql2": "^2.x",
  "multer": "^1.4.x",
  "bcryptjs": "^2.x",
  "jsonwebtoken": "^8.x"
}
```

### Frontend
```json
{
  "react": "^18.x",
  "react-leaflet": "^4.x",
  "leaflet": "^1.x",
  "lucide-react": "^0.x"
}
```

---

## 🚀 התקנה והפעלה

### Development

```bash
# התקן תלויות
npm install

# הרץ מיגרציות
npm run migrate  # או ידנית:
# mysql -u root -p database < migrations/012_marketplace_system.sql
# mysql -u root -p database < migrations/013_marketplace_orders.sql

# הפעל שרת dev
npm run dev
```

### Production

ראה [DEPLOYMENT_GUIDE_MARKETPLACE.md](DEPLOYMENT_GUIDE_MARKETPLACE.md)

---

## 🎨 UI/UX Features

- **Responsive design** - עובד מצוין ב-mobile, tablet, desktop
- **Dark mode support** - כל הקומפוננטים תומכים ב-dark mode
- **RTL** - תמיכה מלאה בעברית מימין לשמאל
- **Animations** - fade-in, slide-in, hover effects
- **Loading states** - spinners ו-skeletons
- **Error handling** - הודעות שגיאה ידידותיות
- **Toast notifications** - alerts עבור פעולות
- **Accessibility** - ARIA labels, keyboard navigation

---

## 🔐 Security

- **Authentication** - JWT tokens
- **Authorization** - Role-based (user, vendor, admin)
- **Input validation** - Backend + Frontend
- **SQL injection protection** - Prepared statements
- **XSS protection** - React escaping
- **CSRF protection** - Headers validation
- **File upload limits** - 15MB, images only
- **Rate limiting** - על API endpoints (לעתיד)

---

## 📊 Analytics & Monitoring

**Vendor Statistics:**
- Total orders, completed orders
- Total revenue, average order value
- Unique customers count
- Daily orders trend (7 days)
- Top selling items

**Admin Analytics:**
- Pending vendors count
- Active vendors count
- Total orders system-wide
- Pending reports

---

## 🔄 Workflow

### Customer Journey:
1. גלוש במפה או ברשימה
2. צפה במוכרים פתוחים (ירוק) / סגורים (אדום)
3. לחץ על מוכר לפרטים
4. הוסף מנות לסל
5. צור הזמנה עם פרטי איסוף
6. קבל התראות על שינוי סטטוס
7. כתוב ביקורת

### Vendor Journey:
1. הירשם ויצור חנות (3 שלבים)
2. המתן לאישור admin
3. נהל תפריט - הוסף/ערוך/מחק מנות
4. הגדר שעות פתיחה וסגירות מיוחדות
5. קבל התראה על הזמנה חדשה
6. אשר הזמנה → סמן כמוכן → סמן כהושלם
7. פרסם עדכונים/מבצעים
8. צפה בסטטיסטיקות ובמנות הפופולריות

### Admin Journey:
1. קבל רשימת מוכרים ממתינים
2. אשר/דחה מוכרים חדשים
3. טפל בדוחות קהילתיים
4. השהה/אפשר מוכרים
5. צפה בסטטיסטיקות כלליות

---

## 🐛 Known Issues / Future Enhancements

### לעשות בעתיד:
- [ ] תשלום אונליין (Stripe/PayPal/Tranzila)
- [ ] Chat בין לקוחות למוכרים
- [ ] מערכת קופונים והנחות
- [ ] תמיכה בשפות נוספות (רוסית, אנגלית)
- [ ] Push notifications (PWA)
- [ ] Email notifications
- [ ] SMS notifications (Twilio)
- [ ] Advanced filtering (טווח מחירים, קטגוריות)
- [ ] Favorites / Wishlist
- [ ] Order history export (PDF/CSV)
- [ ] Vendor analytics dashboard (charts)
- [ ] Multi-vendor cart checkout
- [ ] Delivery option (בנוסף לאיסוף)
- [ ] Rating system for delivery/pickup experience
- [ ] Bulk menu upload (CSV)
- [ ] Seasonal menu items

---

## 🤝 תרומה

העבודה נעשתה על ידי Claude Sonnet 4.5 בשיתוף פעולה עם הצוות.

---

## 📄 License

MIT License - ראה LICENSE file

---

## 📞 תמיכה

לשאלות או בעיות:
- פתח issue ב-GitHub
- צור קשר עם הצוות

---

**נבנה עם ❤️ עבור הקהילה הג'והורית**

🌍 Connecting tradition with technology
