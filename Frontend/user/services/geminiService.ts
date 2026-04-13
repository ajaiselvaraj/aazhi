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
  step: 'WELCOME' | 'BILL_TYPE' | 'BILL_CONSUMER_ID' | 'BILL_DETAILS' | 'PAYMENT_METHOD' | 'UPI_QR' | 'PAYMENT_SUCCESS' | 'COMPLAINT_DEPT' | 'COMPLAINT_ID' | 'COMPLAINT_DESC' | 'COMPLAINT_SUCCESS' | 'QUERIES_MODE';
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

  // NLP Intent Detection Engine
  static detectIntent(q: string) {
    if (q.match(/\b(pay|bill|payment|dues)\b/i) && q.match(/\b(electric|power|tneb)\b/i)) return { intent: 'PAY_BILL_DIRECT', dept: 'Electricity' };
    if (q.match(/\b(pay|bill|payment)\b/i) && q.match(/\b(water|metro)\b/i)) return { intent: 'PAY_BILL_DIRECT', dept: 'Water' };
    if (q.match(/\b(pay|bill|payment)\b/i) && q.match(/\b(gas|png)\b/i)) return { intent: 'PAY_BILL_DIRECT', dept: 'Gas' };
    
    if (q.match(/\b(complain|complaint|issue|report)\b/i) && q.match(/\b(water|leak|pipe)\b/i)) return { intent: 'COMPLAINT_DIRECT', dept: 'Water' };
    if (q.match(/\b(complain|complaint|issue|report)\b/i) && q.match(/\b(electric|power|spark|wire)\b/i)) return { intent: 'COMPLAINT_DIRECT', dept: 'Electricity' };

    if (q.match(/\b(pay|bill|payment|dues)\b/i)) return { intent: 'START_BILL' };
    if (q.match(/\b(complain|complaint|issue|report)\b/i) && q.match(/\b(gas|lpg|cylinder|png)\b/i)) return { intent: 'GAS_COMPLAINT' };
    if (q.match(/\b(complain|complaint|issue|report|broken|fix)\b/i)) return { intent: 'START_COMPLAINT' };
    if (q.match(/\b(gas|lpg|cylinder|png)\b/i) && q.match(/\b(service|connection|booking|refill|meter|install)\b/i)) return { intent: 'GAS_SERVICES' };
    if (q.match(/^\s*gas\s*$/i) || q.match(/\bgas\s*(department|services?)\b/i)) return { intent: 'GAS_SERVICES' };
    if (q.match(/\b(status|track|history|check)\b/i)) return { intent: 'CHECK_STATUS' };
    if (q.match(/\b(service|apply|new connection)\b/i)) return { intent: 'NEW_SERVICE' };
    if (q.match(/\b(help|guide|how to|support)\b/i)) return { intent: 'HELP' };
    
    return { intent: 'UNKNOWN' };
  }

  static async getResponse(query: string, voiceEnabled: boolean, t: (key: string) => string): Promise<AIResponse> {
    const q = query.toLowerCase().trim();

    // GLOBAL RESET
    if (q === 'home' || q === 'reset' || q === 'cancel' || q === 'start' || q === 'hi' || q === 'hello' || q === 'menu') {
      this.resetSession();
      return this.renderWelcome(voiceEnabled, t);
    }

    // ZERO-SHOT NLP ROUTING (Interrupts current state if a strong new intent is found)
    const nlp = this.detectIntent(q);
    
    if (nlp.intent === 'CHECK_STATUS') {
      this.resetSession();
      return {
        text: t('ai_statusNavText') || "Taking you to the application tracker...",
        voice: voiceEnabled ? t('ai_statusNavText') || "Taking you to the application tracker." : undefined,
        actions: [{ type: 'NAVIGATE', payload: 'tracker' }]
      };
    }

    if (nlp.intent === 'NEW_SERVICE' && session.step === 'WELCOME') {
      return {
        text: t('ai_serviceLoading') || "Opening the services portal for you...",
        voice: voiceEnabled ? t('ai_openServiceRequest') || "Opening services portal." : undefined,
        actions: [{ type: 'NAVIGATE', payload: 'services' }]
      };
    }

    if (nlp.intent === 'GAS_SERVICES') {
      this.resetSession();
      return {
        text: t('ai_gasNavText') || "Opening Gas Department services for you...",
        voice: voiceEnabled ? t('ai_gasNavText') || "Opening Gas Department services." : undefined,
        actions: [{ type: 'NAVIGATE', payload: 'gas' }]
      };
    }

    if (nlp.intent === 'GAS_COMPLAINT') {
      this.resetSession();
      return {
        text: t('ai_gasComplaintNav') || "Taking you to the Gas complaint form...",
        voice: voiceEnabled ? t('ai_gasComplaintNav') || "Opening gas complaint form." : undefined,
        actions: [{ type: 'NAVIGATE', payload: 'gas' }]
      };
    }

    if (nlp.intent === 'PAY_BILL_DIRECT') {
      session.data.billType = nlp.dept;
      session.step = 'BILL_CONSUMER_ID';
      const label = nlp.dept === 'Electricity' ? t('ai_consumerNumber') || "Consumer Number" : t('ai_connectionId') || "Connection ID";
      const enterMsg = (t('ai_enterConsumerId') || "Please enter your {billType} {label} to proceed.")
        .replace('{billType}', session.data.billType)
        .replace('{label}', label);
      return { text: `Got it! You want to pay your ${nlp.dept} bill.\n\n${enterMsg}`, voice: voiceEnabled ? enterMsg : undefined };
    }

    if (nlp.intent === 'COMPLAINT_DIRECT') {
      session.data.dept = nlp.dept;
      session.step = 'COMPLAINT_ID';
      return {
        text: `I can help you report an issue with ${nlp.dept}.\n\nPlease enter the location or area ID so we can dispatch a team.`,
        voice: voiceEnabled ? "Please tell me the area ID or location." : undefined
      };
    }

    if (nlp.intent === 'START_BILL' && session.step === 'WELCOME') {
      q === '1'; // simulate picking option 1
    } else if (nlp.intent === 'START_COMPLAINT' && session.step === 'WELCOME') {
      q === '3'; // simulate picking option 3
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
        if (q === '3' || nlp.intent === 'START_COMPLAINT') {
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
        if (q === '4' || nlp.intent === 'CHECK_STATUS') {
          return {
            text: t('ai_statusNavText') || "Taking you to the application tracker...",
            voice: voiceEnabled ? t('ai_statusNavText') || "Taking you to the application tracker." : undefined,
            actions: [{ type: 'NAVIGATE', payload: 'tracker' }]
          };
        }
        if (q === '5' || q.includes('query') || q.includes('question')) {
          session.step = 'QUERIES_MODE';
          return {
            text: t('ai_queriesWelcome') || "You are now in Queries mode. Please type your question, and I will answer dynamically based on your request. Type 'home' to go back.",
            voice: voiceEnabled ? t('ai_queriesWelcome') || "You are now in Queries mode. Please type your question." : undefined
          };
        }
        
        // NLP Helper for unknown commands in Welcome state
        if (nlp.intent !== 'UNKNOWN') {
           return { text: "I can help with that, please follow the menu options below to get started.", menu: this.renderWelcome(voiceEnabled, t).menu };
        }

        // Default Welcome
        return {
           text: `I'm not exactly sure what you mean by "${query}". Here is the main menu.`,
           menu: this.renderWelcome(voiceEnabled, t).menu,
           voice: voiceEnabled ? "I didn't catch that. Here is the main menu." : undefined
        };

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
        return { text: t('ai_invalidSelection') || "Please select a valid option from the menu or type what you need.", voice: voiceEnabled ? t('ai_invalidSelection') : undefined, menu: {
            heading: "Valid Options:",
            options: [{ id: '1', label: t('ai_billElec') }, { id: '2', label: t('ai_billWater') }, { id: '3', label: t('ai_billGas') }, { id: '5', label: t('ai_backOption') }]
        } };

      case 'BILL_CONSUMER_ID':
        if (q.length < 3) return { text: t('ai_invalidNumber') || "That consumer ID seems too short. Please try again.", voice: voiceEnabled ? t('ai_invalidNumber') : undefined };

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

      case 'QUERIES_MODE':
        if (q === 'home' || q === 'menu' || q === 'exit' || q === 'back') {
          this.resetSession();
          return this.renderWelcome(voiceEnabled, t);
        }
        try {
          const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
          if (!API_KEY) {
            return {
              text: `Analyzing your question regarding "${query}"... \n\n(Note: Set VITE_GEMINI_API_KEY to see real AI). This is a simulated response to: '${query}'. If you have more questions, keep asking! Type 'home' to exit.`,
              voice: voiceEnabled ? "I have analyzed your query." : undefined
            };
          }
          
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `You are SUVIDHA, a helpful municipal kiosk assistant. Answer the user's question concisely in 2-3 sentences. User question: ${query}` }] }]
            })
          });
          
          const data = await response.json();
          if (data.error) {
            return {
              text: `AI Error: ${data.error.message || "Unknown error"}. Please check your API key.`,
              voice: voiceEnabled ? "AI error occurred." : undefined
            };
          }
          let answerText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response from the AI.";
          
          return {
            text: `${answerText}\n\nType 'home' to exit Queries mode.`,
            voice: voiceEnabled ? answerText : undefined
          };
        } catch (e: any) {
          return {
            text: `Network Error: ${e.message || "Failed to reach AI service"}. Type 'home' to exit.`,
            voice: voiceEnabled ? "Network error." : undefined
          };
        }
    }

    return this.renderWelcome(voiceEnabled, t);
  }

  static renderWelcome(voice: boolean, t: (key: string) => string): AIResponse {
    return {
      text: `${t('ai_welcome')}\n\n${t('ai_whatToDo')}\n1. ${t('ai_payBill')}\n2. ${t('ai_serviceRequest')}\n3. ${t('ai_registerComplaint')}\n4. ${t('ai_checkStatus')}\n5. ${t('ai_queries') || "Queries"}`,
      voice: voice ? `${t('ai_welcome')}. ${t('ai_whatToDo')}.` : undefined,
      menu: {
        heading: t('ai_mainMenu'),
        options: [
          { id: '1', label: t('ai_payBill') },
          { id: '2', label: t('ai_serviceRequest') },
          { id: '3', label: t('ai_registerComplaint') },
          { id: '4', label: t('ai_checkStatus') },
          { id: '5', label: t('ai_queries') || "Queries" }
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
