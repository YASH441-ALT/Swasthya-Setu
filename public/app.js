document.addEventListener('DOMContentLoaded', () => {
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  const patientCards = document.querySelectorAll('.patient-card');

  searchBtn.addEventListener('click', () => {
    const searchTerm = searchInput.value.trim().toLowerCase();

    patientCards.forEach(card => {
      const nameElement = card.querySelector('.patient-name');
      const name = nameElement ? nameElement.textContent.toLowerCase() : '';

      if (name.includes(searchTerm)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  });
});
