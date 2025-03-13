function rentHouse() {
    alert("Thank you for your interest! We will contact you soon.");
}


document.addEventListener("DOMContentLoaded", function () {
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");

    searchForm.addEventListener("submit", function (event) {
        let query = searchInput.value.trim();

        // Regular expression: Only allows letters and spaces (no numbers or special characters)
        let regex = /^[a-zA-Z\s]+$/;

        if (query === "" || !regex.test(query)) {
            alert("Please enter a valid city name (letters only, no numbers or special characters).");
            event.preventDefault(); // Stop form submission
        }
    });
});
