FROM nginx:1.27-alpine

# Arquivos estáticos do site (HTML, CSS e JavaScript)
COPY . /usr/share/nginx/html

# Redirecionamentos relativos: "/admin" vira "/admin/" mantendo a porta 5500
# (sem isso o nginx manda o navegador para http://localhost/admin/, porta 80)
RUN echo "absolute_redirect off;" > /etc/nginx/conf.d/redirecionamento.conf

EXPOSE 80
