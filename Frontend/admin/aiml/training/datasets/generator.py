import csv
import os
import random
from datetime import datetime, timedelta

# Define coordinates for wards (Guwahati region)
WARD_COORDS = {
    'Ward 1': [26.182, 91.745],
    'Ward 2': [26.195, 91.758],
    'Ward 3': [26.171, 91.762],
    'Ward 4': [26.208, 91.731],
    'Ward 5': [26.164, 91.776],
    'Ward 6': [26.212, 91.724],
    'Ward 7': [26.155, 91.749],
    'Ward 8': [26.226, 91.768],
    'Ward 9': [26.141, 91.735],
    'Ward 10': [26.234, 91.752],
}

# Define templates for synthetic complaints with spelling errors, multilingual phrases, and noisy text
TEMPLATES = {
    "water": [
        ("Water pipeline burst", "Major water pipe burst on Main Street in {ward}. Drinking water is leaking onto the road. Pani barbad ho raha hai and pressure is low."),
        ("No water supply", "We have not received any drinking water supply for the last 3 days in {ward}. Pani nahi aa raha hai kab se! Look into this urgently."),
        ("Contaminated water", "The drinking water supplied today is yellow and smells like drainage. It is completely unfit for consumption. Ganda pani aa raha hai."),
        ("Drainage leakage", "Sewage water is overflowing from the main manhole and entering our house compound in {ward}. Drain leakage is creating health hazard."),
        ("Low water pressure", "Municipal water pressure is extremely low. It takes hours to fill a single bucket. Please fix pani ka pressure.")
    ],
    "electricity": [
        ("Power outage", "Unscheduled power cuts for the past 8 hours in {ward}. Bijli chali gayi hai subah se, electronic items are getting damaged."),
        ("Transformer sparking", "The electric transformer near the local market is sparking and emitting smoke. Transformer me spark ho raha hai, dangerous situation."),
        ("Streetlights broken", "None of the streetlights are working in our lane in {ward}. Dark and unsafe at night. Gali me andhera hai streetlight fix karo."),
        ("Dangling wire", "A live high-voltage electrical cable has snapped and is hanging low over the road near {ward} school. Dangling wire is critical threat."),
        ("Meter billing issue", "My digital electricity meter is running twice as fast even when all switches are turned off. Meter reading issue.")
    ],
    "roads": [
        ("Potholes on road", "Huge potholes have formed on the main road in {ward}. Sadak kharab ho gayi hai, multiple two-wheelers skidded today."),
        ("Broken footpath", "The pedestrian footpath is completely broken and blocked by debris near {ward} metro station. Footpath chalne layak nahi hai."),
        ("Open manhole", "A deep sewer manhole is lying open on the middle of the road in {ward}. Open gutter, death trap for drivers."),
        ("Road flooding", "Every time it rains, the street gets flooded with knee-deep water because roadside drains are blocked. Sadak par paani bhara hai."),
        ("Traffic light malfunction", "Traffic lights at the main crossing in {ward} are flashing yellow and causing severe jams. Signal is broken.")
    ],
    "sanitation": [
        ("Garbage dump overflow", "Municipal garbage bin has not been cleared for a week. Garbage spilling, kachra overflow and dogs scattering it in {ward}."),
        ("Dead animal removal", "A dead stray dog is lying on the side of the road near {ward} park. It is smelling terrible. Please clear kachra/dead body."),
        ("Clogged storm drain", "The drainage canal next to our housing society in {ward} is filled with plastic bottles and black mud, emitting a bad odour."),
        ("Public toilet unhygienic", "Public toilet near {ward} bus stand has no running water and is extremely filthy. Toilet clean nahi hai."),
        ("No garbage collection", "The municipal waste collection truck has skipped our sector in {ward} for the last four days. Kachrewala nahi aaya.")
    ],
    "billing": [
        ("Incorrect billing amount", "I received a water bill of Rs. 15,000 this month in {ward}. typical bill is Rs 300. Galat billing amount hai, calculate error."),
        ("Double payment charge", "I paid my electricity bill through portal. Money debited twice but status is still unpaid. Bill payment error double charge."),
        ("No receipt generated", "Payment for property tax was successful in {ward}, but no digital receipt was generated or sent. Receipt nahi mila."),
        ("Consumer ID link error", "System says my consumer ID is invalid when I try to query my monthly dues. Link validation error.")
    ],
    "property_tax": [
        ("Tax assessment error", "My house tax assessment shows double the square footage of my actual property. Need correction. Tax assessment mistake."),
        ("Property registration link", "Unable to link my property tax ID to my mobile number on the municipal portal. Portal registration issue."),
        ("Incorrect tax rebate", "Senior citizen tax discount was not applied to my online tax calculation in {ward}. Rebate not given.")
    ],
    "general": [
        ("Stray dog menace", "A pack of aggressive stray dogs has gathered near the children's park in {ward}, attacking passersby. Stray dogs dangerous."),
        ("Street vendor encroachment", "Street vendors have blocked the entire entrance gate of our society in {ward}. Encroachment problem."),
        ("Loudspeaker noise pollution", "Loud music is being played at high volume after midnight from the party hall near {ward} hospital. Noise pollution.")
    ]
}

SPAM_TEMPLATES = [
    "Earn $5000 a day working from home! Click here: www.fakeurl.com/money",
    "Buy cheap luxury watches, Rolex, Omega. 90% discount today only at watchstore.biz",
    "Online casino! Sign up now and get 100 free spins. Play roulette, blackjack, win real cash!",
    "Test complaint, please ignore this. Just testing the kiosk text input box 12345.",
    "Hello world, test 1 2 3.",
    "Get rich quick, crypto tokens trading signal. Join our telegram channel for profits.",
    "Cheap weight loss pills, burn fat fast. Natural supplements no exercise needed."
]

WARDS = list(WARD_COORDS.keys())

def introduce_typos(text, probability=0.08):
    """Introduce realistic typos (letter swaps/omissions) to simulate citizen inputs."""
    if not text:
        return text
    chars = list(text)
    typo_map = {
        'a': 's', 's': 'd', 'd': 'f', 'f': 'g', 'g': 'h', 'h': 'j', 'j': 'k', 'k': 'l', 
        'q': 'w', 'w': 'e', 'e': 'r', 'r': 't', 't': 'y', 'y': 'u', 'u': 'i', 'i': 'o', 'o': 'p',
        'z': 'x', 'x': 'c', 'c': 'v', 'v': 'b', 'b': 'n', 'n': 'm'
    }
    for i in range(len(chars)):
        if chars[i].isalpha() and random.random() < probability:
            char_lower = chars[i].lower()
            if char_lower in typo_map:
                new_char = typo_map[char_lower]
                chars[i] = new_char.upper() if chars[i].isupper() else new_char
    return "".join(chars)

def generate_dataset(file_path, num_records=1000):
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "ticket_number", "subject", "description", "department", "category",
            "priority", "ward", "is_spam", "submit_count", "created_at",
            "resolution_hours", "sla_breached", "status", "latitude", "longitude"
        ])
        
        start_date = datetime.now() - timedelta(days=60)
        
        for i in range(num_records):
            ticket_number = f"CMP-{random.randint(100000, 999999)}"
            ward = random.choice(WARDS)
            base_coords = WARD_COORDS[ward]
            
            # Generate lat/lng coordinates with realistic localized Gaussian jitter
            latitude = round(base_coords[0] + random.gauss(0, 0.005), 6)
            longitude = round(base_coords[1] + random.gauss(0, 0.005), 6)
            
            created_at = start_date + timedelta(
                days=random.randint(0, 59),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )
            
            is_spam = random.random() < 0.05
            
            if is_spam:
                subject = "Promotional Alert" if random.random() < 0.5 else "Test"
                description = random.choice(SPAM_TEMPLATES)
                department = "general"
                category = "spam"
                priority = "low"
                submit_count = random.randint(5, 30)
                resolution_hours = 0.0
                sla_breached = False
                status = "rejected"
            else:
                department = random.choice(list(TEMPLATES.keys()))
                subject_tpl, desc_tpl = random.choice(TEMPLATES[department])
                subject = subject_tpl
                
                # Apply word noise, typos, and format ward
                desc = desc_tpl.format(ward=ward)
                desc_noisy = introduce_typos(desc)
                description = desc_noisy
                
                category = department
                
                # Assign priorities logically
                if any(w in description.lower() for w in ["sparking", "burst", "dangling"]):
                    priority = "critical"
                elif any(w in description.lower() for w in ["no supply", "outage", "contaminated"]):
                    priority = "high"
                elif any(w in description.lower() for w in ["low", "broken", "clogged"]):
                    priority = "medium"
                else:
                    priority = "low"
                
                submit_count = random.randint(1, 2)
                
                base_hours = {
                    "electricity": 8.0,
                    "water": 16.0,
                    "billing": 24.0,
                    "property_tax": 48.0,
                    "sanitation": 36.0,
                    "roads": 72.0,
                    "general": 48.0
                }[department]
                
                priority_factor = {"critical": 0.25, "high": 0.5, "medium": 1.0, "low": 1.5}[priority]
                resolution_hours = max(1.0, base_hours * priority_factor * random.uniform(0.5, 1.8))
                resolution_hours = round(resolution_hours, 2)
                
                sla_limit = {"critical": 4, "high": 24, "medium": 72, "low": 120}[priority]
                sla_breached = resolution_hours > sla_limit
                
                age_days = (datetime.now() - created_at).days
                if age_days < 2:
                    status = "pending" if random.random() < 0.8 else "in_progress"
                else:
                    status = "resolved" if random.random() < 0.9 else "rejected"
            
            writer.writerow([
                ticket_number, subject, description, department, category,
                priority, ward, int(is_spam), submit_count, created_at.isoformat(),
                resolution_hours, int(sla_breached), status, latitude, longitude
            ])
            
    print(f"[SUCCESS] Generated {num_records} hybrid complaints in {file_path}")

if __name__ == "__main__":
    from configs.settings import DATASETS_DIR
    target = os.path.join(DATASETS_DIR, "historical_complaints.csv")
    generate_dataset(target)
