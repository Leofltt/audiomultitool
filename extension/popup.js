document.addEventListener('DOMContentLoaded', () => {
  const rows = document.querySelectorAll('.tool-row');
  rows.forEach(row => {
    row.addEventListener('click', () => {
      const path = row.getAttribute('data-path') || '';
      chrome.tabs.create({ url: `https://audiomultitool.com/${path}` });
    });
  });
});
