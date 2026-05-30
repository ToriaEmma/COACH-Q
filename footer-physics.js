(function () {
  const ballSources = ['IMG_0638.PNG', 'IMG_0639.PNG', 'IMG_0640.PNG'];
  let pendingStart = false;

  window.CoachQFooterPhysics = {
    start() {
      pendingStart = true;
    },
  };

  function loadImages(sources) {
    return Promise.all(
      sources.map((src) => {
        return new Promise((resolve) => {
          const image = new Image();
          image.onload = () => resolve({ src, image });
          image.onerror = () => resolve(null);
          image.src = src;
        });
      })
    ).then((items) => items.filter(Boolean));
  }

  function initFooterPhysics(images) {
    const footer = document.querySelector('.site-footer');
    const canvas = document.querySelector('.footer-physics');

    if (!footer || !canvas || !window.Matter || images.length === 0) {
      return;
    }

    const ctx = canvas.getContext('2d');
    const engine = Matter.Engine.create();
    const world = engine.world;
    const balls = [];
    const bounds = [];
    const delayedCalls = [];

    engine.gravity.y = 1.05;

    function resizeCanvas() {
      const rect = footer.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      Matter.World.remove(world, bounds);
      bounds.length = 0;

      bounds.push(
        Matter.Bodies.rectangle(rect.width / 2, rect.height + 42, rect.width + 140, 84, {
          isStatic: true,
        }),
        Matter.Bodies.rectangle(-42, rect.height / 2, 84, rect.height + 260, {
          isStatic: true,
        }),
        Matter.Bodies.rectangle(rect.width + 42, rect.height / 2, 84, rect.height + 260, {
          isStatic: true,
        })
      );

      Matter.World.add(world, bounds);
    }

    function makeBall(index) {
      const rect = footer.getBoundingClientRect();
      const radius = Math.min(72, Math.max(42, rect.width * 0.055 + Math.random() * 18));
      const x = radius + Math.random() * Math.max(radius, rect.width - radius * 2);
      const y = -radius * 2 - index * 54;
      const body = Matter.Bodies.circle(x, y, radius, {
        restitution: 0.74,
        friction: 0.28,
        frictionAir: 0.01,
        density: 0.001,
      });

      body.plugin = {
        image: images[index % images.length].image,
        radius,
      };

      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 5.5,
        y: 1 + Math.random() * 3.5,
      });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.22);

      balls.push(body);
      Matter.World.add(world, body);
    }

    function drawBall(body) {
      const meta = body.plugin;
      const radius = meta.radius;
      const size = radius * 2;

      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(meta.image, -radius, -radius, size, size);
      ctx.restore();
    }

    function render() {
      const rect = footer.getBoundingClientRect();

      Matter.Engine.update(engine, 1000 / 60);
      ctx.clearRect(0, 0, rect.width, rect.height);
      balls.forEach(drawBall);
    }

    function spawnWave() {
      delayedCalls.splice(0).forEach((call) => call.kill?.());
      Matter.World.remove(world, balls);
      balls.length = 0;
      ctx.clearRect(0, 0, footer.getBoundingClientRect().width, footer.getBoundingClientRect().height);

      const count = Math.max(9, images.length * 4);

      for (let index = 0; index < count; index += 1) {
        const delay = index * 0.18;

        if (window.gsap) {
          delayedCalls.push(window.gsap.delayedCall(delay, () => makeBall(index)));
        } else {
          window.setTimeout(() => makeBall(index), delay * 1000);
        }
      }
    }

    resizeCanvas();

    if (window.gsap) {
      window.gsap.ticker.fps(60);
      window.gsap.ticker.add(render);
    } else {
      (function loop() {
        render();
        window.requestAnimationFrame(loop);
      })();
    }

    window.addEventListener('resize', resizeCanvas);
    window.CoachQFooterPhysics = {
      start: spawnWave,
    };

    if (pendingStart) {
      spawnWave();
    }
  }

  function boot() {
    loadImages(ballSources).then(initFooterPhysics);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
