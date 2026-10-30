(function () {
  const form = document.getElementById("serviceRequestForm");
  const status = document.getElementById("serviceFormStatus");
  const button = document.getElementById("serviceSubmit");
  const phone = form.elements.phone;

  phone.addEventListener("input", function () {
    phone.value = phone.value.replace(/\D/g, "").slice(0, 10);
  });
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    status.classList.remove("error");
    if (!form.checkValidity()) {
      form.reportValidity();
      status.textContent = "Please enter valid contact details and describe the service you need.";
      status.classList.add("error");
      return;
    }
    button.disabled = true;
    button.textContent = "Sending request…";
    status.textContent = "";
    const formData = new FormData(form);
    const request = Object.fromEntries(formData.entries());
    try {
      const response = await fetch(API_URL + "/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not send your request.");
      form.reset();
      status.textContent = "Request #" + body.requestId + " received. ALFA SYSTEMS will contact you to discuss the next steps.";
    } catch (error) {
      status.textContent = error.message || "Could not send your request. Please try again or contact us by phone.";
      status.classList.add("error");
    } finally {
      button.disabled = false;
      button.textContent = "Send Service Request";
    }
  });
})();
