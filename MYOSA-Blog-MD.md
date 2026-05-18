---  
**publishDate:** 2026-05-18  
  
**title:** MAKE-BoTs (Modular Adaptive Knowledge Exchange with Bluetooth of Things) 
  
**excerpt:** A modular smart sensor ecosystem built using the MYOSA platform, featuring real-time environmental monitoring. A complementary app facilitates user-friendly local dashboard streaming, and intelligent sensor analysis for smart home applications.
  
**image:** <img src="MYOSA/cover_image.png">
  
**tags:**  
  - Internet of Things
  - Bluetooth of Things
  - Smart-Home 
  - Embedded Systems
---  
  
> **A modular AI-powered smart sensor ecosystem that enables real-time environmental monitoring, intelligent analysis, and smart home automation.** 
  
---  
  
## Acknowledgements  

| **Name**              | **Institute**      | **Address**    | **Email**                     | **Contact**    |
| --------------------- | ------------------ | -------------- | ----------------------------- | -------------- |
| Anania Temtim Cherkos | Khalifa University | Abu Dhabi, UAE | ananiatem@gmail.com           | +971 568674085 |
| Mohammed Yaseen Hafiz | Khalifa University | Sharjah, UAE   | hmyaseen05@gmail.com          | +971 552650088 |
| Nanda Venugopal       | Khalifa University | Abu Dhabi, UAE | nandavenugopalstudy@gmail.com | +971 568327601 |
| Nevan John Thomas     | Khalifa University | Abu Dhabi, UAE | nevan.john.thomas@gmail.com   | +971 565614890 |
Our team members above along with our team supervisor Engr. Nafissa Maaz have been the driving force behind this project. Each member contributed by working on a use-case for a singular sensor with collaborative effort in combining their functionality for one cohesive project.
## Overview  

MAKE BoTs (Modular Adaptive Knowledge Exchange with Bluetooth of Things) is a modular smart-home and environmental monitoring ecosystem built using the MYOSA platform. The project combines embedded sensor modules, Bluetooth mesh networking, AI-assisted interpretation, and a locally hosted real-time dashboard to create an affordable, privacy-focused smart environment solution.

The system uses distributed sensor nodes powered by ESP32-based hardware and MYOSA-compatible sensors to collect environmental data such as temperature, pressure, motion, light intensity, and gesture information. This data is processed locally and displayed through an interactive web dashboard, reducing dependency on cloud-based services while improving privacy and responsiveness.
## Demo / Examples  

### Images  

<img src="MYOSA/assets/images/Main Homepage.jpeg">
Main Homepage

<img src="MYOSA/assets/images/Home Intrusion Detection.jpeg">
Accelerometer Functionality to detect Home Intrusion

<img src="MYOSA/assets/images/Intrustion Detected.jpeg">
Door Opened while House Lock Set, intrusion is detected and people are notified through the webserver

<img src="MYOSA/assets/images/temperature_page.jpeg">
Temperature Page

<img src="MYOSA/assets/images/usecases.jpeg">
Sensor Usecases

<img src="MYOSA/assets/images/ai_recommendation.jpeg">
AI Recommendations

<img src="MYOSA/assets/images/Home Temperature Gradient.jpeg">
Home Temperature Gradient Monitor

<img src="MYOSA/assets/images/Home Environmental Trends.jpeg">
Home Humidity and Pressure Monitor

<img src="MYOSA/assets/images/LIVE Display.jpeg">
Live Display
### Videos  
  
## Features (Detailed)  

### Real-Time Environmental Monitoring

- Live temperature and pressure streaming using BMP180
- Continuous sensor polling and dynamic UI updates
- Active/standby sensor state detection
### Modular Sensor Ecosystem

- Plug-and-play architecture for future sensor modules
- Independent functionality pages for each sensor use case
- Scalable design for home automation and analytics

### AI-Assisted Sensor Analysis

- Fever testing workflow using averaged temperature readings
- AI interpretation pipeline for contextual sensor feedback
- Expandable architecture for additional AI-based analyses

### Privacy-Focused Smart System

- Local dashboard hosting
- Local sensor aggregation and processing
- Reduced cloud dependency for sensitive data handling

### Modern Dashboard UI

- Interactive dark-themed dashboard
- Responsive sensor cards
- Live updating values and system status
- Functional navigation between sensor modules

### Smart Home Integration Potential

The platform is designed to support:

- Circadian rhythm wake-up systems
- Plant monitoring
- Home security monitoring
- Weather and environmental tracking
- Multi-room sensor communication

---

## Usage Instructions  


To run the webserver for the project, python v3.12 must be installed on a local network machine and the following scripts need to be run. 

```plaintext

python -m pip install -r requirements.txt

```

```plaintext

python app.py

```

The webserver will be deployed on localhost (127.0.0.1) and can be accessed by any device on the local network through the local IP of the webserver.

For prototype functionality, all the sensors must be connected to the ESP32 or multiple ESP32s which will post the data to localhost endpoints. For testing we used an Arduino and Raspberry Pi 5 as we only received one ESP32 in the kit. The temperature sensor was connected to the Arduino and the Accelerometer and Gyroscope was connected to the Raspberry Pi 5.

## Tech Stack  

Our tech stack combines core hardware to 

### Hardware

- Arduino Uno
    
- Raspberry Pi 5
    
- MYOSA Platform
    
- BMP180 Pressure & Temperature Sensor
    
- ESP32 
    
- OLED SSD1306 Display 
    
- MPU6050 Accelerometer & Gyroscope
    
- APDS9960 Gesture & Light Sensor
    

### Software

- Python
    
- Flask
    
- HTML/CSS/JavaScript
    
- Arduino C++
    
- Gemini API / LLM Integration
    
- Serial Communication
    
- Bluetooth Mesh Networking (planned)
    

### AI & Processing

- Gemini API
    
- Local AI-assisted interpretation pipeline
    
- Sensor data averaging and preprocessing
    

## Requirements / Installation  

**

### Python Dependencies

Install required packages:

```plaintext
pip install -r requirements.txt
```
### Arduino Requirements

Install:

- Adafruit BMP085/BMP180 Library
- Wire Library

### Hardware Setup

Connect BMP180:

| BMP180 | Arduino Uno |
| ------ | ----------- |
| VCC    | 3.3V        |
| GND    | GND         |
| SDA    | SDA         |
| SCL    | SCL         |
### Raspberry Pi 5 Requirements

Connect BMP180:

| MPU6050 | Pi 5         |
| ------- | ------------ |
| VCC     | 3.3V - Pin 1 |
| GND     | GND - Pin 6  |
| SDA     | SDA - Pin 3  |
| SCL     | SCL - Pin 5  |


## File Structure (Optional)  
  
## License (Optional)  
  
## Contribution Notes (Optional)**