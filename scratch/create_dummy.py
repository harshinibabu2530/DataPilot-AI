import pandas as pd
import numpy as np

# Set random seed
np.random.seed(42)

# Create dummy data
n = 100
data = {
    'user_id': range(1001, 1001 + n),
    'year': np.random.choice([2024, 2025, 2026], size=n),
    'country': np.random.choice(['USA', 'UK', 'Canada', 'Germany', 'Australia'], size=n),
    'age_group': np.random.choice(['18-24', '25-34', '35-54', '55+'], size=n),
    'gender': np.random.choice(['Male', 'Female', 'Non-binary'], size=n),
    'platform': np.random.choice(['Instagram', 'TikTok', 'YouTube', 'Twitter', 'Facebook'], size=n),
    'avg_sleep_hours': np.round(np.random.uniform(5.0, 9.0, size=n), 1),
    'sleep_quality_score': np.round(np.random.uniform(4.0, 9.5, size=n), 1),
    'late_night_usage_hours': np.round(np.random.uniform(0.5, 4.5, size=n), 1),
    'night_notifications': np.random.randint(0, 25, size=n),
    'fatigue_level': np.round(np.random.uniform(1.0, 5.0, size=n), 1)
}

df = pd.DataFrame(data)
df.to_csv('c:/Users/Admin/Desktop/DataPilot AI/scratch/dummy_sleep_data.csv', index=False)
print("Dummy dataset created at c:/Users/Admin/Desktop/DataPilot AI/scratch/dummy_sleep_data.csv")
