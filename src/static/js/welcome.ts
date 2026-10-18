const checkmark = '<svg width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>';

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) { // @ts-ignore
    return parts.pop().split(';').shift();
  }
}


const cp = (window as any).clientVars?.cookiePrefix || '';

const transferNowSelector = '[data-l10n-id="index.transferSessionNow"]';

// The error elements carry data-l10n-id="index.sessionTransferError", so the
// message is always localized by html10n. Server-supplied error strings are
// English-only and are deliberately never shown to the user.
const setSessionTransferErrorVisible = (id: string, visible: boolean) => {
  const element = document.getElementById(id);
  if (element) element.style.display = visible ? 'block' : 'none';
};

const safeJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const isValidTransferId = (id: unknown): id is string =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// Resolves to the transfer id, or null if the request failed in any way
// (network error, non-2xx status, malformed body, invalid id).
const createTransferId = async (): Promise<string | null> => {
  try {
    // The author token is HttpOnly (ether/etherpad#6701 PR3) so we cannot
    // read it via document.cookie. Send only the JS-readable prefsHttp; the
    // server reads the token off the request's own cookie jar.
    const response = await fetch('./tokenTransfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prefsHttp: getCookie(`${cp}prefsHttp`) || getCookie('prefsHttp'),
      }),
    });
    const data = await safeJson(response) as {id?: unknown} | null;
    if (!response.ok || data == null || typeof data !== 'object') return null;
    return isValidTransferId(data.id) ? data.id : null;
  } catch {
    return null;
  }
};

function handleTransferOfSession() {
  const transferNowButton = document.querySelector(transferNowSelector)! as HTMLButtonElement;

  transferNowButton.addEventListener('click', async () => {
    const originalButtonContent = transferNowButton.innerHTML;
    setSessionTransferErrorVisible('transfer-session-error', false);
    const copyLinkSectionBefore = document.getElementById('copy-link-section');
    if (copyLinkSectionBefore) copyLinkSectionBefore.style.display = 'none';
    transferNowButton.style.display = 'inline-flex';
    transferNowButton.style.alignItems = 'center';
    transferNowButton.style.justifyContent = 'center';
    transferNowButton.disabled = true;

    const transferId = await createTransferId();

    // Closing the settings dialog rebuilds its contents, so the nodes
    // captured before the request may now be detached. Re-query them so
    // the result lands in the dialog the user will actually see.
    const currentButton =
        document.querySelector(transferNowSelector) as HTMLButtonElement | null;
    const copyLinkSection = document.getElementById('copy-link-section');
    const copyButton =
        document.querySelector('#copy-link-section .btn-secondary') as HTMLButtonElement | null;

    if (transferId == null || !copyLinkSection || !copyButton) {
      if (copyLinkSection) copyLinkSection.style.display = 'none';
      transferNowButton.innerHTML = originalButtonContent;
      transferNowButton.disabled = false;
      setSessionTransferErrorVisible('transfer-session-error', true);
      return;
    }

    copyLinkSection.style.display = 'block';
    copyButton.disabled = false;
    copyButton.onclick = async () => {
      await navigator.clipboard.writeText(transferId);
      copyButton.style.display = 'inline-flex';
      copyButton.style.alignItems = 'center';
      copyButton.style.justifyContent = 'center';
      copyButton.innerHTML = `${checkmark}`;
      copyButton.disabled = true;
    };
    const button = currentButton ?? transferNowButton;
    button.style.display = 'inline-flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.innerHTML = `${checkmark}`;
    button.disabled = true;
  });
}

// True while a redemption request is in flight. Module-level so it survives
// the settings dialog being rebuilt, and so input events cannot re-enable the
// button and start an overlapping request.
let redeemPending = false;

const updateRedeemButtonState = () => {
  const button = document.getElementById('transferSessionButton') as HTMLButtonElement | null;
  const input = document.getElementById('codeInput') as HTMLInputElement | null;
  if (!button) return;
  button.disabled = redeemPending || !isValidTransferId(input?.value);
};

async function redeemTransferCode(code: string) {
  if (redeemPending || !isValidTransferId(code)) return;
  redeemPending = true;
  setSessionTransferErrorVisible('receive-session-error', false);
  updateRedeemButtonState();

  let redeemed = false;
  try {
    const response = await fetch(`./tokenTransfer/${encodeURIComponent(code)}`, {
      method: 'GET',
    });
    const data = await safeJson(response) as {ok?: unknown} | null;
    redeemed = response.ok && data != null && typeof data === 'object' && data.ok === true;
  } catch {
    redeemed = false;
  }

  if (redeemed) {
    // Leave redeemPending set so the button stays disabled until reload.
    window.location.reload();
    return;
  }
  redeemPending = false;
  updateRedeemButtonState();
  setSessionTransferErrorVisible('receive-session-error', true);
}

const handleSettingsButtonClick = () => {
  const settingsButton = document.querySelector('.settings-button')!;
  const settingsDialog = document.getElementById('settings-dialog') as HTMLDialogElement;
  let initialSettingsHtml: string;

  settingsDialog.addEventListener('click', (e) => {
    if (e.target === settingsDialog) {
      settingsDialog.close();
      settingsDialog.innerHTML = initialSettingsHtml;
      handleMenuBarClicked();
      handleTransferOfSession();
    }
  });

  settingsButton.addEventListener('click', () => {
    initialSettingsHtml = settingsDialog.innerHTML;
    settingsDialog.showModal();
  });
};


const handleMenuBarClicked = () => {
  const menuBar = document.getElementById('button-bar')!;
  menuBar.querySelectorAll('button').forEach((button, index)=>{
    button.addEventListener('click', ()=>{
      menuBar.querySelectorAll('button').forEach((btn)=>btn.classList.remove('active-btn'));
      button.classList.add('active-btn');

      const sections: NodeListOf<HTMLDivElement> = document.querySelectorAll('#settings-dialog > div');
      sections.forEach((section, index)=>index >= 1 && (section.style.display = 'none'));
      (sections[index +1] as HTMLElement).style.display = 'block';
    });
  })

  const transferSessionButton = document.getElementById('transferSessionButton');
  const codeInputField = document.getElementById('codeInput') as HTMLInputElement | null;
  if (transferSessionButton && codeInputField) {
    transferSessionButton.addEventListener('click', () => {
      redeemTransferCode(codeInputField.value);
    });
  }

  if (codeInputField) {
    codeInputField.addEventListener('input', () => {
      setSessionTransferErrorVisible('receive-session-error', false);
      updateRedeemButtonState();
    });
  }
  updateRedeemButtonState();

}

window.addEventListener('load', () => {
  handleSettingsButtonClick();
  handleMenuBarClicked();
  handleTransferOfSession();
});
