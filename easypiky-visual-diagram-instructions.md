# 🎨 EasyPiky AWS Architecture - Visual Diagram Instructions

## 📋 **How to Create the Visual Diagram**

### **Step 1: Access Draw.io**
1. Go to **https://app.diagrams.net/**
2. Choose "Create New Diagram"
3. Select "AWS Architecture" template
4. Name it "EasyPiky-AWS-Architecture"

### **Step 2: Import AWS Icons**
1. Click on "More Shapes" (bottom left)
2. Enable "AWS Architecture 2021"
3. Enable "AWS Architecture 2022" 
4. Click "Apply"

### **Step 3: Create the Diagram Layout**

#### **Top Section: Users & Browsers**
```
Components to Add:
- 4x "User" icons (from General shapes)
- 4x "Browser" or "Client" rectangles
- Label them: Chrome Extension, Edge Extension, Firefox Extension, Browser Extension
```

#### **Middle Section: AWS Services**
```
AWS Components to Add:

1. API Gateway:
   - Drag "Amazon API Gateway" icon
   - Label: "Amazon API Gateway"
   - Subtitle: "api.easypiky.com"
   - Add number "①" 

2. Lambda Function:
   - Drag "AWS Lambda" icon  
   - Label: "AWS Lambda Function"
   - Subtitle: "easypiky-validator"
   - Add number "②"

3. DynamoDB:
   - Drag "Amazon DynamoDB" icon
   - Label: "Amazon DynamoDB" 
   - Subtitle: "easypiky-tokens"
   - Add number "③"

4. Monitoring Row:
   - CloudWatch icon → "Amazon CloudWatch"
   - CloudTrail icon → "Amazon CloudTrail" 
   - SNS icon → "Amazon SNS"
   - Add number "④"
```

#### **Bottom Section: Security Layer**
```
Security Components:
- AWS WAF icon → "AWS WAF"
- IAM icon → "IAM Roles & Policies"
- KMS icon → "AWS KMS Encryption"
- VPC icon → "VPC (Optional)"
```

### **Step 4: Add Connections**
```
Arrows to Draw:
1. Users → API Gateway (HTTPS)
2. API Gateway → Lambda (Invoke)
3. Lambda → DynamoDB (Read/Write)
4. All services → CloudWatch (Metrics)
5. All services → CloudTrail (Audit)
6. CloudWatch → SNS (Alerts)
```

### **Step 5: Add Labels and Numbers**
```
Numbered Flow:
① POST /validate (Browser to API Gateway)
② Token Validation (API Gateway to Lambda)  
③ Token Storage (Lambda to DynamoDB)
④ Monitoring & Alerts (All services to monitoring)
```

### **Step 6: Styling**
```
Colors to Use:
- AWS Orange (#FF9900) for service boxes
- Blue (#232F3E) for text
- Green (#7AA116) for arrows
- Gray (#F2F3F3) for background sections
```

### **Step 7: Add Text Boxes**
```
Information Boxes:
- Title: "EasyPiky Anti-Phishing Extension - AWS Serverless Backend"
- Cost box: "$0/month within AWS Free Tier"
- Privacy box: "100% Client-Side Analysis, Anonymous Tokens Only"
- Workflow box: "Trial Token Validation Only - No URL Analysis in Cloud"
```

## 🎯 **Alternative: Use This Template**

### **Lucidchart Template (Recommended)**
1. Go to **https://lucidchart.com**
2. Sign up for free account
3. Choose "AWS Architecture" template
4. Follow the same component layout above
5. Lucidchart has better AWS icons and styling

### **CloudCraft (3D Option)**
1. Go to **https://cloudcraft.co**
2. Create free account
3. Use 3D AWS components
4. Export as high-resolution image

## 📊 **Component Details for Visual Diagram**

### **Service Specifications to Include:**

#### **API Gateway Box:**
```
Amazon API Gateway
- REST API Endpoint
- Rate Limiting: 1000 req/min
- CORS Enabled
- HTTPS Only (TLS 1.3)
- Edge Optimized
```

#### **Lambda Box:**
```
AWS Lambda Function
- Runtime: Node.js 18.x
- Memory: 128 MB
- Timeout: 30 seconds
- Concurrent Executions: 100
```

#### **DynamoDB Box:**
```
Amazon DynamoDB
- Table: easypiky-trial-tokens
- Billing: Pay-per-request
- Encryption: At rest + in transit
- Multi-AZ: Enabled
```

## 🎨 **Final Export Options**

### **High-Quality Export:**
1. File → Export As → PNG
2. Set resolution to 300 DPI
3. Choose "Transparent Background"
4. Size: 1920x1080 or larger

### **Professional Formats:**
- **PNG** - For presentations and web
- **SVG** - For scalable vector graphics  
- **PDF** - For documentation
- **JPEG** - For email and sharing

## 📋 **Checklist for Professional Diagram**

- [ ] All AWS service icons are official AWS icons
- [ ] Numbered workflow (①②③④) is clearly visible
- [ ] Arrows show clear data flow direction
- [ ] Color scheme matches AWS branding
- [ ] Text is readable at presentation size
- [ ] Privacy-first messaging is prominent
- [ ] Cost information is included
- [ ] Security layer is clearly separated
- [ ] Title and subtitle are professional

## 🚀 **Quick Start: 15-Minute Version**

If you want to create this quickly:

1. **Use Draw.io** (free, no signup required)
2. **Import AWS shapes** (takes 2 minutes)
3. **Drag 7 main components** (API Gateway, Lambda, DynamoDB, CloudWatch, CloudTrail, SNS, Users)
4. **Connect with arrows** (numbered ①②③④)
5. **Add title and cost box**
6. **Export as PNG**

This will give you a professional AWS architecture diagram that matches the visual style of your reference image!

---

**Need help with any specific step?** Let me know which diagramming tool you prefer, and I can provide more detailed instructions for that platform.