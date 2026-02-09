import puppeteer from "puppeteer";

const url = "http://127.0.0.1:4173/";

const browser = await puppeteer.launch({ headless: "new" });
try {
  const page = await browser.newPage();

  async function measure(viewport) {
    await page.setViewport(viewport);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    return await page.evaluate(() => {
      const nav = document.querySelector("nav");
      const main = document.querySelector("main#content");
      const hero = document.querySelector(".section.hero");
      const vimeoTarget = document.querySelector("[data-lazy-vimeo-target]");
      const vimeoPicture = document.querySelector("[data-lazy-vimeo-target] picture");
      const vimeoImg = document.querySelector("[data-lazy-vimeo-target] img");

      const rect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: r.height };
      };

      const navR = rect(nav);
      const mainR = rect(main);
      const heroR = rect(hero);
      const targetR = rect(vimeoTarget);
      const pictureR = rect(vimeoPicture);
      const imgR = rect(vimeoImg);

      const gaps = {
        nav_to_main: navR && mainR ? mainR.top - navR.bottom : null,
        nav_to_hero: navR && heroR ? heroR.top - navR.bottom : null,
        nav_to_target: navR && targetR ? targetR.top - navR.bottom : null,
        nav_to_picture: navR && pictureR ? pictureR.top - navR.bottom : null,
        nav_to_img: navR && imgR ? imgR.top - navR.bottom : null,
        target_to_picture: targetR && pictureR ? pictureR.top - targetR.top : null,
        hero_to_target: heroR && targetR ? targetR.top - heroR.top : null,
        target_to_img: targetR && imgR ? imgR.top - targetR.top : null,
      };

      const computed = {
        main: main
          ? {
              paddingTop: getComputedStyle(main).paddingTop,
              marginTop: getComputedStyle(main).marginTop,
              display: getComputedStyle(main).display,
            }
          : null,
        hero: hero
          ? {
              marginTop: getComputedStyle(hero).marginTop,
              paddingTop: getComputedStyle(hero).paddingTop,
            }
          : null,
        target: vimeoTarget
          ? {
              marginTop: getComputedStyle(vimeoTarget).marginTop,
              paddingTop: getComputedStyle(vimeoTarget).paddingTop,
              position: getComputedStyle(vimeoTarget).position,
            }
          : null,
        picture: vimeoPicture
          ? {
              display: getComputedStyle(vimeoPicture).display,
              position: getComputedStyle(vimeoPicture).position,
              top: getComputedStyle(vimeoPicture).top,
              inset: getComputedStyle(vimeoPicture).inset,
              marginTop: getComputedStyle(vimeoPicture).marginTop,
              paddingTop: getComputedStyle(vimeoPicture).paddingTop,
            }
          : null,
        img: vimeoImg
          ? {
              display: getComputedStyle(vimeoImg).display,
              position: getComputedStyle(vimeoImg).position,
              top: getComputedStyle(vimeoImg).top,
              inset: getComputedStyle(vimeoImg).inset,
              transform: getComputedStyle(vimeoImg).transform,
            }
          : null,
      };

      return { navR, mainR, heroR, targetR, pictureR, imgR, gaps, computed };
    });
  }

  const desktop = await measure({ width: 1440, height: 900, deviceScaleFactor: 2 });
  const mobile = await measure({
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  console.log(JSON.stringify({ desktop, mobile }, null, 2));
} finally {
  await browser.close();
}
