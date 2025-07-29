'use strict';


window.customStart = () => {
  // define your javascript here
  // jquery is available - except index.js
  // you can load extra scripts with $.getScript http://api.jquery.com/jQuery.getScript/
  const recentPadList = document.getElementById('recent-pads');
  const parentStyle = recentPadList.parentElement.style;
  const recentPadListHeading = document.querySelector('[data-l10n-id="index.recentPads"]');
  const recentPadsFromLocalStorage = localStorage.getItem('recentPads');
  let recentPadListData = [];
  if (recentPadsFromLocalStorage != null) {
    recentPadListData = JSON.parse(recentPadsFromLocalStorage);
  }

  if (recentPadListData.length === 0) {
    recentPadListHeading.setAttribute('data-l10n-id', 'index.recentPadsEmpty');
    parentStyle.display = 'flex';
    parentStyle.justifyContent = 'center';
    parentStyle.alignItems = 'center';
    parentStyle.height = '100%';
    recentPadList.remove();
  } else {
    /**
     * @typedef {Object} Pad
     * @property {string} name
     */

    /**
     * @param {Pad} pad
     */
    recentPadListData.forEach((pad) => {
      const li = document.createElement('li');
      li.className = 'recent-pad';
      const padPath = `${window.location.href}p/${pad.name}`;
      li.innerHTML = `<a href="${padPath}">${pad}</a>`;
      recentPadList.appendChild(li);
    });
  }
};
