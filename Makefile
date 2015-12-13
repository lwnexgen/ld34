date := $(shell date +%Y-%m-%d)
test:
	tar -czf /var/www/html/drop.$(date).tar.gz /var/www/html/drop
	rm -rf /var/www/html/drop
	cp -a /mnt/megapenthes/Development/ludum_dare/drop /var/www/html/

