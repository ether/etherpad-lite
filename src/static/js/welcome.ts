const checkmark = '<svg width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>';

function handleTransferOfSession() {
  const transferNowButton = document.querySelector('[data-l10n-id="index.transferSessionNow"]')! as HTMLButtonElement;

  transferNowButton.addEventListener('click', () => {
    transferNowButton.style.display = 'inline-flex';
    transferNowButton.style.alignItems = 'center';
    transferNowButton.style.justifyContent = 'center';
    transferNowButton.innerHTML = `${checkmark}`;
    transferNowButton.disabled = true;

    fetch("pluginfw/")

  });
}


const handleSettingsButtonClick = () => {
  const settingsButton = document.querySelector('.settings-button')!;
  const settingsDialog = document.getElementById('settings-dialog') as HTMLDialogElement;
  let initialSettingsHtml: string;

  settingsDialog.addEventListener('click', (e) => {
    if (e.target === settingsDialog) {
      settingsDialog.close();
      settingsDialog.innerHTML = initialSettingsHtml;
    }
  });

  settingsButton.addEventListener('click', () => {
    initialSettingsHtml = settingsDialog.innerHTML;
    settingsDialog.showModal();
  });
};


window.addEventListener('load', () => {
  handleSettingsButtonClick();
  handleTransferOfSession();
});
