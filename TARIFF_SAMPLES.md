# TNERC FY 2025-26 Tariff Calculation Samples

This document validates the logic implemented in the Tariff Engine against the mandatory tariff rules.

## 1. Domestic Consultation (LT I-A)
**Scenario**: User consumes **550 Units**.
*Rule*: Slab-based telescopic pricing. Fixed Charge: ₹0.

| Slab Range | Units in Slab | Rate (₹) | Cost (₹) |
| :--- | :--- | :--- | :--- |
| 0 - 100 | 100 | 0.00 | 0.00 |
| 101 - 200 | 100 | 2.35 | 235.00 |
| 201 - 400 | 200 | 4.70 | 940.00 |
| 401 - 500 | 100 | 6.30 | 630.00 |
| 501 - 600 | 50 | 8.40 | 420.00 |
| **Total** | **550** | | **₹ 2,225.00** |

---

## 2. Commercial (LT)
**Scenario**: Shop consumes **150 Units**.
*Rule*: 0-100 @ ₹6.45, >100 @ ₹10.15.

| Slab Range | Units in Slab | Rate (₹) | Cost (₹) |
| :--- | :--- | :--- | :--- |
| 0 - 100 | 100 | 6.45 | 645.00 |
| > 100 | 50 | 10.15 | 507.50 |
| **Total** | **150** | | **₹ 1,152.50** |

---

## 3. Industrial (LT)
**Scenario**: Small Factory, **1000 Units**, **10 kW Connected Load**.
*Rule*: ₹8.00/unit + Fixed Charge (₹589/kW max est).

*   **Energy Charge**: 1000 units * ₹8.00 = ₹8,000.00
*   **Fixed Charge**: 10 kW * ₹589 = ₹5,890.00
*   **Total Payable**: **₹ 13,890.00**

---

## 4. Power Loom (LT)
**Scenario**: Weaver consumes **1200 Units**.
*Rule*: First 1000 Free, Excess @ Applicable Tariff (Est. ₹8.00).

*   **0 - 1000 Units**: Free (Subsidy)
*   **1001 - 1200 Units**: 200 * ₹8.00 = ₹1,600.00
*   **Total Payable**: **₹ 1,600.00**

---

## 5. Public Worship (LT)
**Scenario**: Temple consumes **150 Units**.
*Rule*: 0-120 @ ₹3.05, >120 @ ₹7.50.

| Slab Range | Units in Slab | Rate (₹) | Cost (₹) |
| :--- | :--- | :--- | :--- |
| 0 - 120 | 120 | 3.05 | 366.00 |
| > 120 | 30 | 7.50 | 225.00 |
| **Total** | **150** | | **₹ 591.00** |
