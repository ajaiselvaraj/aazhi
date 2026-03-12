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
 * All text is passed through the t() function to honour the selected language.
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
            text: `${t('ai_selectBillType')}\n1. ${t('ai_billElec')}\n2. ${t('ai_billWater')}\n3. ${t('ai_billGas')}\n4. ${t('ai_billMunicipal')}\n5. ${t('ai_backOption')}`,
            voice: voiceEnabled ? `${t('ai_selectBillType')} 1 ${t('ai_billElec')}, 2 ${t('ai_billWater')}, 3 ${t('ai_billGas')}.` : undefined,
            menu: {
              heading: t('ai_selectBillTypeMenu'),
              options: [
                { id: '1', label: t('ai_billElec') },
                { id: '2', label: t('ai_billWater') },
                { id: '3', label: t('ai_billGas') },
                { id: '4', label: t('ai_billMunicipal') },
                { id: '5', label: t('ai_backOption') }
              ]
            }
          };
        }
        if (q === '2' || q.includes('service')) {
          return {
            text: t('ai_serviceLoading'),
            voice: voiceEnabled ? t('ai_openServiceRequest') : undefined,
            actions: [{ type: 'NAVIGATE', payload: 'services' }]
          };
        }
        if (q === '3' || q.includes('complaint')) {
          session.step = 'COMPLAINT_DEPT';
          return {
            text: `${t('ai_selectDept')}\n1. ${t('ai_deptElec')}\n2. ${t('ai_deptWater')}\n3. ${t('ai_deptSanitation')}\n4. ${t('ai_deptMunicipal')}\n5. ${t('ai_backOption')}`,
            voice: voiceEnabled ? t('ai_selectDept') : undefined,
            menu: {
              heading: t('ai_selectDeptMenu'),
              options: [
                { id: '1', label: t('ai_deptElec') },
                { id: '2', label: t('ai_deptWater') },
                { id: '3', label: t('ai_deptSanitation') },
                { id: '4', label: t('ai_deptMunicipal') },
                { id: '5', label: t('ai_backOption') }
              ]
            }
          }
        }
        // Default Welcome
        return this.renderWelcome(voiceEnabled, t);

      case 'BILL_TYPE':
        if (q === '5') { this.resetSession(); return this.renderWelcome(voiceEnabled, t); }
        if (['1', '2', '3', '4'].includes(q)) {
          session.data.billType = q === '1' ? t('ai_billElec') : q === '2' ? t('ai_billWater') : t('ai_billGas');
          session.step = 'BILL_CONSUMER_ID';
          const label = q === '1' ? t('ai_consumerNumber') : t('ai_connectionId');
          const enterMsg = t('ai_enterConsumerId')
            .replace('{billType}', session.data.billType)
            .replace('{label}', label);
          return {
            text: enterMsg,
            voice: voiceEnabled ? enterMsg : undefined
          };
        }
        return { text: t('ai_invalidSelection'), voice: voiceEnabled ? t('ai_invalidSelection') : undefined };

      case 'BILL_CONSUMER_ID':
        if (q.length < 5) return { text: t('ai_invalidNumber'), voice: voiceEnabled ? t('ai_invalidNumber') : undefined };

        session.data.consumerId = q;
        session.step = 'BILL_DETAILS';
        session.data.amount = 850; // Mock

        return {
          text: `${t('ai_billDetails')}\n${t('ai_billName')} ${MOCK_USER_PROFILE.name}\n${t('ai_billAmountDue').replace('{amount}', session.data.amount)}\n${t('ai_billDueDate')}\n\n1. ${t('ai_payNow')}\n2. ${t('ai_cancelOption')}`,
          voice: voiceEnabled ? t('ai_billFoundVoice').replace('{name}', MOCK_USER_PROFILE.name).replace('{amount}', session.data.amount) : undefined,
          menu: {
            heading: t('ai_billSummaryMenu'),
            options: [
              { id: '1', label: t('ai_payNow') },
              { id: '2', label: t('ai_cancelOption') }
            ]
          }
        };

      case 'BILL_DETAILS':
        if (q === '2') { this.resetSession(); return this.renderWelcome(voiceEnabled, t); }
        if (q === '1') {
          session.step = 'PAYMENT_METHOD';
          return {
            text: `${t('ai_selectPayMethod')}\n1. ${t('ai_payUPI')}\n2. ${t('ai_payCard')}\n3. ${t('ai_payNetBanking')}\n4. ${t('ai_backOption')}`,
            voice: voiceEnabled ? `${t('ai_selectPayMethod')} 1 ${t('ai_payUPI')}.` : undefined,
            menu: {
              heading: t('ai_payMethodMenu'),
              options: [
                { id: '1', label: t('ai_payUPI') },
                { id: '2', label: t('ai_payCard') },
                { id: '3', label: t('ai_payNetBanking') },
                { id: '4', label: t('ai_backOption') }
              ]
            }
          };
        }
        return { text: t('ai_invalidOption'), voice: undefined };

      case 'PAYMENT_METHOD':
        if (q === '1') {
          session.step = 'UPI_QR';
          return {
            text: `${t('ai_upiPayment')}\n\n${t('ai_scanQr')}\n${t('ai_upiAmount')}\n\n1. ${t('ai_paymentCompleted')}\n2. ${t('ai_cancelOption')}`,
            voice: voiceEnabled ? t('ai_scanQrVoice') : undefined,
            menu: {
              heading: t('ai_upiStepsMenu'),
              options: [{ id: '1', label: t('ai_paymentCompleted') }, { id: '2', label: t('ai_cancelOption') }]
            }
          }
        }
        return { text: t('ai_methodNotSupported'), voice: undefined };

      case 'UPI_QR':
        if (q === '1') {
          session.step = 'PAYMENT_SUCCESS';
          return {
            text: `${t('ai_paySuccess')}\n${t('ai_txnId')}\n${t('ai_amountPaid')}\n\n1. ${t('ai_downloadReceipt')}\n2. ${t('ai_home')}`,
            voice: voiceEnabled ? t('ai_paySuccessVoice') : undefined,
            menu: {
              heading: t('ai_successMenu'),
              options: [{ id: '1', label: t('ai_downloadReceipt') }, { id: '2', label: t('ai_home') }]
            }
          }
        }
        if (q === '2') { this.resetSession(); return this.renderWelcome(voiceEnabled, t); }
        return { text: t('ai_waitingConfirm'), voice: undefined };

      case 'PAYMENT_SUCCESS':
        this.resetSession();
        return this.renderWelcome(voiceEnabled, t);

      // --- COMPLAINT FLOW ---
      case 'COMPLAINT_DEPT':
        if (['1', '2', '3', '4'].includes(q)) {
          session.data.dept = q === '1' ? t('ai_deptElec') : t('ai_deptWater');
          session.step = 'COMPLAINT_ID';
          return {
            text: t('ai_enterComplaintId'),
            voice: voiceEnabled ? t('ai_enterIdVoice') : undefined
          };
        }
        return { text: t('ai_invalidOption'), voice: undefined };

      case 'COMPLAINT_ID':
        session.data.id = q;
        session.step = 'COMPLAINT_DESC';
        return {
          text: `${t('ai_selectIssue')}\n1. ${t('ai_issueNoSupply')}\n2. ${t('ai_issueWrongBill')}\n3. ${t('ai_issueInfra')}\n4. ${t('ai_issueOther')}`,
          voice: voiceEnabled ? t('ai_selectIssue') : undefined,
          menu: {
            heading: t('ai_selectIssueMenu'),
            options: [
              { id: '1', label: t('ai_issueNoSupplyShort') },
              { id: '2', label: t('ai_issueWrongBill') },
              { id: '3', label: t('ai_issueInfraShort') },
              { id: '4', label: t('ai_issueOther') }
            ]
          }
        };

      case 'COMPLAINT_DESC':
        session.step = 'COMPLAINT_SUCCESS';
        return {
          text: `${t('ai_complaintSuccess')}\n${t('ai_complaintId')}\n\n1. ${t('ai_trackStatus')}\n2. ${t('ai_home')}`,
          voice: voiceEnabled ? t('ai_complaintSuccessVoice') : undefined,
          menu: {
            heading: t('ai_complaintDoneMenu'),
            options: [{ id: '1', label: t('ai_trackStatus') }, { id: '2', label: t('ai_home') }]
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
