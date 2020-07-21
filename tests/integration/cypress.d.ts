declare namespace Cypress {
  interface Chainable<Subject> {
    visitLandkid(): void;
    createLandRequest(title: string, isSuccessful: boolean): void;
    waitForAllFinished(prTitles: string[], waitTime?: number): Promise<Record<string, any>>;
    removePR(id: string, branchName: string): void;
  }
}
