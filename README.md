# Cloud-Based Food Delivery Management System

A Cloud-Based Food Delivery Management System is a web-based application that provides a complete platform for customers, restaurants, delivery partners, and administrators to manage the food ordering and delivery process.

The system allows customers to browse restaurants and food items, place orders, make payments, and track deliveries. Restaurants can manage menus and orders, while delivery partners can manage assigned deliveries and update delivery status.

---
[![Live Demo](https://img.shields.io/badge/🚀_Live-Demo-success?style=for-the-badge)](https://ir9g0w-l9izeizrf-arcadawebapps8.vercel.app)

🚀 Features

👤 Customer

- User registration and login
- Browse restaurants
- View food menus
- Search and filter food items
- Add food to cart
- Place food orders
- Online payment
- View order history
- Track order status
- Manage profile and delivery address

🏪 Restaurant

- Restaurant registration/login
- Manage restaurant profile
- Add, update, and delete food items
- Manage food categories
- View incoming orders
- Accept or reject orders
- Update food preparation status
- View sales information

🛵 Delivery Partner

- Delivery partner login
- View assigned orders
- Accept delivery requests
- View customer delivery details
- Update delivery status
- Mark orders as delivered
- View delivery history

👨‍💼 Admin

- Admin authentication
- Manage customers
- Manage restaurants
- Manage delivery partners
- Manage food items
- Monitor orders
- Manage payments
- View system statistics
- Monitor overall platform activity

---

☁️ Cloud Features

- Cloud-based application architecture
- Cloud database
- Cloud image/file storage
- Scalable backend services
- Secure authentication
- REST API communication
- Real-time order status updates
- Cloud deployment support
- Automated backup and recovery

---

🏗️ System Architecture

                   ┌─────────────────────┐
                   │      Customer       │
                   └──────────┬──────────┘
                              │
                   ┌──────────▼──────────┐
                   │   Web / Mobile UI   │
                   └──────────┬──────────┘
                              │
                         HTTPS / REST
                              │
                   ┌──────────▼──────────┐
                   │     API Gateway     │
                   └──────────┬──────────┘
                              │
             ┌────────────────┼────────────────┐
             │                │                │
       ┌─────▼─────┐    ┌────▼─────┐    ┌────▼─────┐
       │   User    │    │  Order   │    │ Restaurant│
       │  Service  │    │ Service  │    │  Service  │
       └─────┬─────┘    └────┬─────┘    └────┬─────┘
             │               │                │
             └───────────────┼────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Cloud Database │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Cloud Storage   │
                    └─────────────────┘

---

🛠️ Technology Stack

Frontend

- HTML5
- CSS3
- JavaScript
- React.js
- Bootstrap / Tailwind CSS

Backend

- Node.js
- Express.js
- REST API
- JWT Authentication

Database

- MySQL / MongoDB
- Cloud Database

Cloud

- AWS / Azure / Google Cloud
- Cloud Storage
- Cloud Database
- Cloud Deployment

Development Tools

- Visual Studio Code
- Git
- GitHub
- Postman
- Docker

---

📂 Project Structure

cloud-food-delivery/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── components/
│   ├── pages/
│   └── package.json
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   ├── server.js
│   └── package.json
│
├── database/
│   └── database.sql
│
├── screenshots/
│   ├── home.png
│   ├── login.png
│   ├── restaurant.png
│   ├── cart.png
│   ├── orders.png
│   └── admin-dashboard.png
│
├── .env.example
├── .gitignore
└── README.md

---

🔄 Order Workflow

Customer
   ↓
Browse Restaurant
   ↓
Select Food
   ↓
Add to Cart
   ↓
Place Order
   ↓
Payment
   ↓
Restaurant Accepts Order
   ↓
Food Preparation
   ↓
Delivery Partner Assigned
   ↓
Out for Delivery
   ↓
Customer Receives Food
   ↓
Order Completed

---

🔐 Security

- JWT-based authentication
- Password encryption
- Role-based access control
- Protected API routes
- Secure environment variables
- Input validation
- HTTPS communication
- Secure payment processing

«Important: Never upload database passwords, API keys, JWT secrets, or cloud credentials to GitHub. Store them in ".env" files and add ".env" to ".gitignore".»

---

⚙️ Installation

1. Clone the Repository

git clone https://github.com/your-username/cloud-food-delivery.git
cd cloud-food-delivery

2. Install Backend

cd backend
npm install

3. Install Frontend

cd ../frontend
npm install

4. Configure Environment Variables

Create a ".env" file in the backend:

PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=food_delivery

JWT_SECRET=your_secret_key

CLOUD_STORAGE_BUCKET=your_bucket
CLOUD_STORAGE_REGION=your_region

5. Start Backend

cd backend
npm start

Backend:

http://localhost:5000

6. Start Frontend

cd frontend
npm run dev

Frontend:

http://localhost:5173

---

🗄️ Database Modules

Users
 ├── Customers
 ├── Restaurants
 ├── Delivery Partners
 └── Admins

Restaurants
 └── Food Items

Customers
 └── Orders

Orders
 ├── Order Items
 ├── Payment
 └── Delivery

Main Tables

Table| Purpose
Users| Stores user accounts
Restaurants| Stores restaurant information
Food_Items| Stores food/menu details
Orders| Stores customer orders
Order_Items| Stores ordered food items
Payments| Stores payment information
Delivery| Stores delivery information
Reviews| Stores customer reviews

---

📡 API Endpoints

Authentication

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile

Food

GET    /api/foods
POST   /api/foods
PUT    /api/foods/:id
DELETE /api/foods/:id

Orders

POST /api/orders
GET  /api/orders
GET  /api/orders/:id
PUT  /api/orders/:id/status

Restaurants

GET  /api/restaurants
POST /api/restaurants
PUT  /api/restaurants/:id
DELETE /api/restaurants/:id

Delivery

GET /api/delivery/orders
PUT /api/delivery/:id/status

---

📊 Admin Dashboard

The administrator can monitor:

- Total customers
- Total restaurants
- Total orders
- Completed orders
- Pending orders
- Cancelled orders
- Total revenue
- Active delivery partners

---

☁️ Cloud Deployment

The application can be deployed using cloud services such as:

Frontend
   ↓
Cloud Hosting
   ↓
Backend API
   ↓
Cloud Database
   ↓
Cloud Storage

Possible deployment options include:

- AWS
- Microsoft Azure
- Google Cloud
- Vercel
- Render

---

📸 Screenshots

Add your project screenshots here:

## 📸 Screenshots

### 🏠 Home Page
![Home Page](screenshots/home.png)

### 🔐 Login Page
![Login](screenshots/login.png)

### 🍕 Restaurant Page
![Restaurant](screenshots/restaurant.png)

### 🛒 Cart
![Cart](screenshots/cart.png)

### 📦 Order Tracking
![Orders](screenshots/orders.png)

### 👨‍💼 Admin Dashboard
![Admin Dashboard](screenshots/admin-dashboard.png)

---

🔮 Future Enhancements

- 📍 GPS-based live delivery tracking
- 🤖 AI food recommendations
- 💬 Customer support chatbot
- 🔔 Push notifications
- 🎟️ Coupon and discount system
- ⭐ Restaurant rating system
- 📊 Advanced analytics
- 🚦 Traffic-aware delivery ETA
- 🗺️ Real-time delivery map
- 📱 Android/iOS application
- ☁️ Kubernetes-based deployment
- 🔄 CI/CD pipeline

---

🌟 Advantages

- Easy online food ordering
- Faster restaurant management
- Centralized order management
- Real-time delivery updates
- Secure user authentication
- Cloud scalability
- Reduced manual work
- Better customer experience

---

🤝 Contributing

Contributions are welcome!

git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

Then create a Pull Request.

---

📄 License

This project is licensed under the MIT License.

---

👨‍💻 Developer

Dinesh M

Cloud-Based Food Delivery Management System

⭐ If you find this project useful, please give it a star!
