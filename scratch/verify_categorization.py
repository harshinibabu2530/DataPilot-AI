import sys
import os
import pandas as pd

# Add the backend directory to system path at the highest priority
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from modules.domain_processor import DomainProcessor

def test_domain_detection():
    print("=" * 60)
    print("RUNNING AI DATASET CATEGORIZATION TEST SUITE")
    print(f"Imported DomainProcessor from: {DomainProcessor.__module__} in {os.path.abspath(sys.modules[DomainProcessor.__module__].__file__)}")
    print("=" * 60)

    # 1. Test HR Schema
    hr_df = pd.DataFrame(columns=["Employee_ID", "Age", "Department", "Monthly_Income", "Job_Satisfaction", "Attrition"])
    hr_domain = DomainProcessor.detect_domain(hr_df)
    print(f"[*] HR Test Schema Columns: {list(hr_df.columns)}")
    print(f"   -> AI Identified: {hr_domain.upper()} (Expected: HR)")
    assert hr_domain == "hr", f"Failed HR detection, got: {hr_domain}"

    # 2. Test Finance Schema
    finance_df = pd.DataFrame(columns=["Transaction_Date", "Account_ID", "Revenue", "Cost_Of_Goods", "Net_Profit", "Operating_Expense"])
    finance_domain = DomainProcessor.detect_domain(finance_df)
    print(f"[*] Finance Test Schema Columns: {list(finance_df.columns)}")
    print(f"   -> AI Identified: {finance_domain.upper()} (Expected: FINANCE)")
    assert finance_domain == "finance", f"Failed Finance detection, got: {finance_domain}"

    # 3. Test Retail Schema
    retail_df = pd.DataFrame(columns=["Order_ID", "Customer_ID", "Product_Name", "SKU", "Quantity", "Price_Per_Unit", "Discount"])
    retail_domain = DomainProcessor.detect_domain(retail_df)
    print(f"[*] Retail Test Schema Columns: {list(retail_df.columns)}")
    print(f"   -> AI Identified: {retail_domain.upper()} (Expected: RETAIL)")
    assert retail_domain == "retail", f"Failed Retail detection, got: {retail_domain}"

    # 4. Test Healthcare Schema
    healthcare_df = pd.DataFrame(columns=["Patient_ID", "Age", "Blood_Glucose", "BMI", "Diagnosis_Code", "Symptom_Severity"])
    healthcare_domain = DomainProcessor.detect_domain(healthcare_df)
    print(f"[*] Healthcare Test Schema Columns: {list(healthcare_df.columns)}")
    print(f"   -> AI Identified: {healthcare_domain.upper()} (Expected: HEALTHCARE)")
    assert healthcare_domain == "healthcare", f"Failed Healthcare detection, got: {healthcare_domain}"

    # 5. Test Generic Schema (no strong matches)
    generic_df = pd.DataFrame(columns=["x_coord", "y_coord", "z_coord", "amplitude", "frequency"])
    generic_domain = DomainProcessor.detect_domain(generic_df)
    print(f"[*] Generic Test Schema Columns: {list(generic_df.columns)}")
    print(f"   -> AI Identified: {generic_domain.upper()} (Expected: GENERIC)")
    assert generic_domain == "generic", f"Failed Generic detection, got: {generic_domain}"

    print("=" * 60)
    print("SUCCESS: AI Dataset Categorization Engine passed all tests!")
    print("=" * 60)

if __name__ == "__main__":
    test_domain_detection()
