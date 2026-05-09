"""
Add sample call logs for testing
"""
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
import json
from datetime import datetime, timedelta
import random

load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")

def add_sample_calls():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Sample queries and responses
    samples = [
        {
            "query": "What are your menu items?",
            "response": "We have Pizza, Burgers, Pasta, and more. Our most popular items are Margherita Pizza for ₹299 and Pepperoni Pizza for ₹399.",
            "business_type": "restaurant",
            "business_name": "Pizza Hut",
            "sentiment": "positive",
            "resolved": True,
            "duration": 45
        },
        {
            "query": "Do you have rooms available?",
            "response": "Yes, we have Standard Rooms at ₹5000 per night and Deluxe Rooms at ₹8000 per night. Would you like to book?",
            "business_type": "hotel",
            "business_name": "Hotel Taj",
            "sentiment": "positive",
            "resolved": True,
            "duration": 38
        },
        {
            "query": "What time do you close?",
            "response": "We are open from 11 AM to 11 PM daily. You can visit us anytime during these hours.",
            "business_type": "restaurant",
            "business_name": "McDonald's",
            "sentiment": "neutral",
            "resolved": True,
            "duration": 22
        },
        {
            "query": "How much is a haircut?",
            "response": "Men's haircut is ₹300 and Women's haircut is ₹500. We also offer hair coloring and styling services.",
            "business_type": "salon",
            "business_name": "Glamour Spa",
            "sentiment": "positive",
            "resolved": True,
            "duration": 31
        },
        {
            "query": "I want to cancel my booking",
            "response": "I understand you want to cancel. Let me transfer you to our booking team who can help you with the cancellation.",
            "business_type": "hotel",
            "business_name": "Marriott Hotel",
            "sentiment": "negative",
            "resolved": False,
            "duration": 52
        },
        {
            "query": "What gym equipment do you have?",
            "response": "We have modern cardio equipment, weight training machines, CrossFit area, and functional training zone. We also offer personal training.",
            "business_type": "gym",
            "business_name": "Fitness First Gym",
            "sentiment": "positive",
            "resolved": True,
            "duration": 41
        },
        {
            "query": "Do you deliver?",
            "response": "Yes, we offer home delivery. Delivery time is 30-40 minutes and minimum order is ₹200.",
            "business_type": "restaurant",
            "business_name": "Pizza Hut",
            "sentiment": "positive",
            "resolved": True,
            "duration": 28
        },
        {
            "query": "What are your doctor's timings?",
            "response": "Dr. Sharma is available from 9 AM to 5 PM. Dr. Patel is available from 2 PM to 8 PM. Would you like to book an appointment?",
            "business_type": "clinic",
            "business_name": "City Health Clinic",
            "sentiment": "positive",
            "resolved": True,
            "duration": 35
        }
    ]
    
    # Add calls with timestamps spread over last 7 days
    for i, sample in enumerate(samples):
        # Random time in last 7 days
        days_ago = random.randint(0, 6)
        hours_ago = random.randint(0, 23)
        created_at = datetime.now() - timedelta(days=days_ago, hours=hours_ago)
        
        # Create transcript
        transcript = json.dumps([
            {
                "role": "user",
                "content": sample["query"],
                "timestamp": created_at.strftime("%H:%M:%S")
            },
            {
                "role": "assistant",
                "content": sample["response"],
                "timestamp": (created_at + timedelta(seconds=2)).strftime("%H:%M:%S")
            }
        ])
        
        cursor.execute("""
            INSERT INTO call_logs 
            (phone_number, duration, transcript, language, message_count, sentiment)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            "+91" + str(random.randint(7000000000, 9999999999)),
            sample["duration"],
            transcript,
            "en-IN",
            2,
            sample["sentiment"]
        ))
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"✅ Added {len(samples)} sample call logs!")
    print("🔄 Refresh your browser to see the data")

if __name__ == "__main__":
    add_sample_calls()
