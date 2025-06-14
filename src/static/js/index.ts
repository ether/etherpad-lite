'use strict';

const randomPadName = () => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  const stringLength = 20;
  const randomarray = new Uint8Array(stringLength);
  crypto.getRandomValues(randomarray);
  let randomstring = '';
  for (let i = 0; i < stringLength; i++) {
    const rnum = Math.floor(randomarray[i] / 4);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return randomstring;
};

$(() => {
  $('#go2Name').on('submit', () => {
    const padname = $('#padname').val();
    if (padname.length > 0) {
      window.location.href = `p/${encodeURIComponent(padname.trim())}`;
    } else {
      alert('Please enter a name');
    }
    return false;
  });

  $('#button').on('click', () => {
    window.location.href = `p/${randomPadName()}`;
  });

  if (typeof window.customStart === 'function') window.customStart();
});

function logout() {
  alert("Logout clicked!");
  document.cookie.split(";").forEach(function(c) {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  window.location.href = "/";
}

function exitToHome() {
  alert("Exit clicked!");
  window.location.href = "/";
}
window.logout = logout;
window.exitToHome = exitToHome;