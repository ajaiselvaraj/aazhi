import { MOCK_USER_PROFILE } from "../constants";

export interface AIResponse {
  text: string;
  voice?: string;
  actions?: AIAction[];
  menu?: AIMenu;
}

export interface AIAction {
  type: 'NAVIGATE' | 'OPEN_BILL' | 'SHOW_MAP';
  payload: string;
}

export interface AIMenu {
  heading: string;
  options: { id: string; label: string; action?: string }[];
}

interface ConversationState {
  step: 'WELCOME' | 'BILL_TYPE' | 'BILL_CONSUMER_ID' | 'BILL_DETAILS' | 'PAYMENT_METHOD' | 'UPI_QR' | 'PAYMENT_SUCCESS' | 'COMPLAINT_DEPT' | 'COMPLAINT_ID' | 'COMPLAINT_DESC' | 'COMPLAINT_SUCCESS';
  data: any;
}

// In-memory session store (simple for single user kiosk)
let session: ConversationState = {
  step: 'WELCOME',
  data: {}
};

/**
 * SUVIDHA Intelligence Brain
 * Handles intent detection, state management, and hybrid responses.
 */
class SuvidhaIntelligence {

  static resetSession() {
    session = { step: 'WELCOME', data: {} };
  }

  static getResponse(query: string, voiceEnabled: boolean, t: (key: string) => string): AIResponse {
    const q = query.toLowerCase().trim();

    // GLOBAL RESET
    if (q === 'home' || q === 'reset' || q === 'cancel' || q === 'start') {
      this.resetSession();
      return this.renderWelcome(voiceEnabled, t);
    }

    // STATE MACHINE
    switch (session.step) {
      case 'WELCOME':
        if (q === '1' || q.includes('pay') || q.includes('bill')) {
          session.step = 'BILL_TYPE';
          return {
            text: "Select Bill Type:\n1. Electricity\n2. Water\n3. Gas\n4. Municipal Tax\n5. Back",
            voice: voiceEnabled ? "Select the bill type. Option 1 Electricity, Option 2 Water, Option 3 Gas." : undefined,
            menu: {
              heading: "Select Bill Type",
              options: [
                { id: '1', label: 'Electricity' },
                { id: '2', label: 'Water' },
                { id: '3', label: 'Gas' },
                { id: '4', label: 'Municipal Tax' },
                { id: '5', label: 'Back' }
              ]
            }
          };
        }
        if (q === '2' || q.includes('service')) {
          return { text: "Service Request module loading...", voice: voiceEnabled ? "Opening service request." : undefined, actions: [{ type: 'NAVIGATE', payload: 'services' }] };
        }
        if (q === '3' || q.includes('complaint')) {
          session.step = 'COMPLAINT_DEPT';
          return {
            text: "Select Department:\n1. Electricity\n2. Water\n3. Sanitation\n4. Municipal\n5. Back",
            voice: voiceEnabled ? "Select the department for your complaint." : undefined,
            menu: {
              heading: "Select Department",
              options: [
                { id: '1', label: 'Electricity' },
                { id: '2', label: 'Water' },
                { id: '3', label: 'Sanitation' },
                { id: '4', label: 'Municipal' },
                { id: '5', label: 'Back' }
              ]
            }
          }
        }
        // Default Welcome
        return this.renderWelcome(voiceEnabled, t);

      case 'BILL_TYPE':
        if (q === '5') { this.resetSession(); return this.renderWelcome(voiceEnabled, t); }
        if (['1', '2', '3', '4'].includes(q)) {
          session.data.billType = q === '1' ? 'Electricity' : q === '2' ? 'Water' : 'Gas';
          session.step = 'BILL_CONSUMER_ID';
          const label = session.data.billType === 'Electricity' ? 'Consumer Number' : 'Connection ID';
          return {
            text: `Please enter your ${session.data.billType} ${label} using the numeric keypad.`,
            voice: voiceEnabled ? `Please enter your ${session.data.billType} number.` : undefined
          };
        }
        return { text: "Invalid selection. Please select 1 to 5.", voice: voiceEnabled ? "Invalid selection." : undefined };

      case 'BILL_CONSUMER_ID':
        if (q.length < 5) return { text: "Invalid Number. Please try again.", voice: voiceEnabled ? "Invalid number." : undefined };

        session.data.consumerId = q;
        session.step = 'BILL_DETAILS';
        session.data.amount = 850; // Mock

        return {
          text: `Bill Details:\nName: ${MOCK_USER_PROFILE.name}\nAmount Due: ₹${session.data.amount}\nDue Date: 15 Feb 2026\n\n1. Pay Now\n2. Cancel`,
          voice: voiceEnabled ? `Bill found for ${MOCK_USER_PROFILE.name}. Amount is 850 rupees. Select 1 to pay.` : undefined,
          menu: {
            heading: "Bill Summary",
            options: [
              { id: '1', label: 'Pay Now' },
              { id: '2', label: 'Cancel' }
            ]
          }
        };

      case 'BILL_DETAILS':
        if (q === '2') { this.resetSession(); return this.renderWelcome(voiceEnabled, t); }
        if (q === '1') {
          session.step = 'PAYMENT_METHOD';
          return {
            text: "Select Payment Method:\n1. UPI\n2. Debit/Credit Card\n3. Net Banking\n4. Back",
            voice: voiceEnabled ? "Select payment method. Option 1 UPI." : undefined,
            menu: {
              heading: "Payment Method",
              options: [
                { id: '1', label: 'UPI' },
                { id: '2', label: 'Card' },
                { id: '3', label: 'Net Banking' },
                { id: '4', label: 'Back' }
              ]
            }
          };
        }
        return { text: "Invalid option.", voice: undefined };

      case 'PAYMENT_METHOD':
        if (q === '1') {
          session.step = 'UPI_QR';
          return {
            text: "UPI Payment\n\nPlease scan the QR code displayed.\nAmount: ₹850\n\n1. Payment Completed\n2. Cancel",
            voice: voiceEnabled ? "Scan the QR code to pay 850 rupees." : undefined,
            menu: {
              heading: "Steps",
              options: [{ id: '1', label: 'Payment Completed' }, { id: '2', label: 'Cancel' }]
            }
          }
        }
        return { text: "Method not supported in demo. Try UPI (1).", voice: undefined };

      case 'UPI_QR':
        if (q === '1') {
          session.step = 'PAYMENT_SUCCESS';
          return {
            text: "Payment Successful!\nTransaction ID: TXN458921\nAmount Paid: ₹850\n\n1. Download Receipt\n2. Home",
            voice: voiceEnabled ? "Payment successful. Thank you." : undefined,
            menu: {
              heading: "Success",
              options: [{ id: '1', label: 'Download Receipt' }, { id: '2', label: 'Home' }]
            }
          }
        }
        if (q === '2') { this.resetSession(); return this.renderWelcome(voiceEnabled, t); }
        return { text: "Waiting for confirmation...", voice: undefined };

      case 'PAYMENT_SUCCESS':
        this.resetSession();
        return this.renderWelcome(voiceEnabled, t);

      // --- COMPLAINT FLOW ---
      case 'COMPLAINT_DEPT':
        if (['1', '2', '3', '4'].includes(q)) {
          session.data.dept = q === '1' ? 'Electricity' : 'Water';
          session.step = 'COMPLAINT_ID';
          return {
            text: "Enter your Complaint Number or Consumer ID.",
            voice: voiceEnabled ? "Enter your ID." : undefined
          };
        }
        return { text: "Invalid option.", voice: undefined };

      case 'COMPLAINT_ID':
        session.data.id = q;
        session.step = 'COMPLAINT_DESC';
        return {
          text: "Select Issue:\n1. No Power / Water\n2. Wrong Bill\n3. Infrastructure Issue\n4. Other",
          voice: voiceEnabled ? "Select the issue type." : undefined,
          menu: {
            heading: "Select Issue",
            options: [
              { id: '1', label: 'No Supply' },
              { id: '2', label: 'Wrong Bill' },
              { id: '3', label: 'Infra Issue' },
              { id: '4', label: 'Other' }
            ]
          }
        };

      case 'COMPLAINT_DESC':
        session.step = 'COMPLAINT_SUCCESS';
        return {
          text: "Complaint Registered Successfully!\nComplaint ID: CMP10245\n\n1. Track Status\n2. Home",
          voice: voiceEnabled ? "Complaint registered. Your ID is C M P 1 0 2 4 5." : undefined,
          menu: {
            heading: "Done",
            options: [{ id: '1', label: 'Track' }, { id: '2', label: 'Home' }]
          }
        };

      case 'COMPLAINT_SUCCESS':
        this.resetSession();
        return this.renderWelcome(voiceEnabled, t);
    }

    return this.renderWelcome(voiceEnabled, t);
  }

  static renderWelcome(voice: boolean, t: (key: string) => string): AIResponse {
    return {
      text: `${t('ai_welcome')}\n\n${t('ai_whatToDo')}\n1. ${t('ai_payBill')}\n2. ${t('ai_serviceRequest')}\n3. ${t('ai_registerComplaint')}\n4. ${t('ai_checkStatus')}`,
      voice: voice ? `${t('ai_welcome')}. ${t('ai_whatToDo')}.` : undefined,
      menu: {
        heading: t('ai_mainMenu'),
        options: [
          { id: '1', label: t('ai_payBill') },
          { id: '2', label: t('ai_serviceRequest') },
          { id: '3', label: t('ai_registerComplaint') },
          { id: '4', label: t('ai_checkStatus') }
        ]
      }
    };
  }
}

/**
 * Unified Assistant Service
 */
export const getAssistantResponse = async (
  query: string,
  t: (key: string) => string,
  voiceEnabled: boolean = false
): Promise<AIResponse> => {
  return SuvidhaIntelligence.getResponse(query, voiceEnabled, t);
};

export const generateCitizenImage = async (prompt: string, aspectRatio: string) => {
  return null;
};
