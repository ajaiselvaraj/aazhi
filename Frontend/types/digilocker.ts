export interface DigiLockerDoc {
    id: string;
    docType: string;
    issuer: string;
    date: string;
    verified: boolean;
    referenceId: string;
}

export interface DigiLockerAuthResponse {
    requestId: string;
    authUrl: string;
}
