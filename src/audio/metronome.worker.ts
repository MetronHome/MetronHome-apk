let timer: ReturnType<typeof setInterval> | null = null;

const ctx: any = self;
ctx.onmessage = (e: MessageEvent) => {
  if (e.data === "start" && timer === null) {
    timer = setInterval(() => ctx.postMessage("tick"), 25);
  } else if (e.data === "stop" && timer !== null) {
    clearInterval(timer);
    timer = null;
  }
};
