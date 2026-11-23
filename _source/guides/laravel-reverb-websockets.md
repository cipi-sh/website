---
title: Real-time Laravel with Reverb, on your own domain
description: Run Laravel Reverb WebSockets behind your app's own domain and certificate, with Supervisor, Nginx and Echo configured for you. No extra ports, no Pusher bill.
category: laravel
order: 3
published: 2026-06-18
updated: 2026-11-23
howto: yes
keywords: laravel reverb production, laravel websockets nginx, laravel echo reverb wss, pusher alternative self-hosted
related:
  - laravel-octane-frankenphp
  - laravel-horizon-queues
  - manage-apps-with-cipi-yml
faq:
  - Do I need a separate subdomain or port? | No. Reverb listens on localhost; Nginx proxies `/app` and `/apps` on the app's own domain and certificate.
  - How many clients can connect? | Cipi raises the open-file limit to 65,535 for Supervisor and Nginx, so thousands of clients can stay connected on a modest server.
  - My app already has routes under /app. | Those paths belong to the WebSocket protocol. Run Reverb for that app on a separate subdomain.
---
[Laravel Reverb](https://reverb.laravel.com) is Laravel's own WebSocket server. Here you'll add live notifications to an app and run Reverb in production on the same domain and certificate as the app: no Pusher account, no extra port to open, no credentials to invent.

<cipi-term name="reverb"></cipi-term>

## 1. Add broadcasting to the project

```bash
$ composer require laravel/reverb
$ php artisan install:broadcasting
```

That installs Echo and writes `resources/js/echo.js`. Broadcast an event:

```php
class OrderShipped implements ShouldBroadcast
{
    public function __construct(public Order $order) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('orders.'.$this->order->user_id)];
    }
}
```

```js
Echo.private(`orders.${userId}`).listen('OrderShipped', (e) => {
    toast(`Order ${e.order.number} shipped`);
});
```

Commit and push.

## 2. Turn Reverb on for the app

```bash
$ sudo cipi app reverb enable shop
$ sudo cipi ssl install shop       # wss:// instead of ws://
$ sudo cipi deploy shop             # Vite bakes VITE_REVERB_* into the bundle
```

```flow
Browser | wss://shop.example.com/app/{key}
Nginx | same domain, same certificate
Reverb on 127.0.0.1 | a port in 9000–9099
Supervisor | shop-reverb, as the app user
```

Cipi generates the `REVERB_*` credentials once, writes the `VITE_REVERB_*` copies for the front end, and proxies only the WebSocket paths. The stock `echo.js` reads exactly those variables.

## 3. Check it

```bash
$ sudo cipi app reverb status shop
 Reverb: enabled 127.0.0.1:9000
 shop-reverb RUNNING pid 21847, uptime 3 days
 Clients dial: wss://shop.example.com:443/app/3f9c1ab27de40518b6c4
```

Events are broadcast from queued jobs, so keep a [worker or Horizon](/guides/laravel-horizon-queues) running.

| Symptom | Fix |
| --- | --- |
| Clients use `ws://` after adding a certificate | `cipi app reverb enable shop` again, then deploy |
| `Missing in .env` in status | Run `enable` again: it fills in missing keys, keeps port and credentials |
| Domain changed | Redeploy so the bundle picks up the new host |

## 4. Keep it in the repository

```yaml
# cipi.yml
workers:
  reverb: true
```

A clone or staging copy gets its own port, credentials and host, never production's.
