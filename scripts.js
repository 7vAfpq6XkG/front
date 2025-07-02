document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('userForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const data = {};
            for (const el of form.elements) {
                if (el.name) data[el.name] = el.value;
            }
            try {
                const response = await fetch('https://microservice2.pythonanywhere.com/check', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    document.getElementById('response').textContent = "Error en el servidor: " + response.status;
                    if (!response.ok) {
                    alert("El usuario ya existe");
                    return;
                }
            }
                let result;
                try {
                    result = await response.json();
                } catch (parseErr) {
                    document.getElementById('response').textContent = "Respuesta inválida del servidor.";
                    return;
                }
                if (result.success) {
                    window.location.href = "pagina_exito.html"; // Cambia por la URL deseada
                } else {
                    document.getElementById('response').textContent = "Error: " + result.error;
                }
            } catch (err) {
                document.getElementById('response').textContent = "Error en el servidor o en la conexión.";
            }
        });
    }
});
