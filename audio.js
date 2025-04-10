// Sound effects for the game
const AUDIO = {
    EMERGENCY_CALL: new Audio('data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/jtAIdcbGyo7cDcyFbeCFvZy+mj4LkeIaW4UEoBqYG6WbpBf4T/+xXd3YfV+vd27d+/dt8Yqc3beWKC/g/zj+iBR0jeBQRgEHAYs0QMxqAGoAFBchqLNwBQIQEwgiQQQRoQmmGrBIlYfpkpgcmR6Q5hpjITdibjd3RGZJsCAwEAIfkEBQoAAgAsAAAAABAAEAAABUyAAIKDAIQnHAYqsUnIoSgGwuUKJgiFkk4AiFWwgGDQzctgAiN3AYYn3UGCM7RyW5hQwwd4NIgUCgojgiCAKOhgXRoxAoqKQIKDVAIBcAEBIfkEBQoAAAAsAAAAABAAEAAAAlQAAiKcAAAqNJAKTZoCjWABDAAQEiwKVgSUCcUiCFYAAJ3AAECIlVoIAiEhADs='),
    DISPATCH: new Audio('data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/jtAIdcbGyo7cDcyFbeCFvZy+mj4LkeIaW4UEoBqYG6WbpBf4T/+xXd3YfV+vd27d+/dt8Yqc3beWKC/g/zj+iBR0jeBQRgEHAYs0QMxqAGoAFBchqLNwBQIQEwgiQQQRoQmmGrBIlYfpkpgcmR6Q5hpjITdibjd3RGZJsCAwEAIfkEBQoAAgAsAAAAABAAEAAABUyAAIKDAIQnHAYqsUnIoSgGwuUKJgiFkk4AiFWwgGDQzctgAiN3AYYn3UGCM7RyW5hQwwd4NIgUCgojgiCAKOhgXRoxAoqKQIKDVAIBcAEBIfkEBQoAAAAsAAAAABAAEAAAAlQAAiKcAAAqNJAKTZoCjWABDAAQEiwKVgSUCcUiCFYAAJ3AAECIlVoIAiEhADs='),
    ARRIVAL: new Audio('data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/jtAIdcbGyo7cDcyFbeCFvZy+mj4LkeIaW4UEoBqYG6WbpBf4T/+xXd3YfV+vd27d+/dt8Yqc3beWKC/g/zj+iBR0jeBQRgEHAYs0QMxqAGoAFBchqLNwBQIQEwgiQQQRoQmmGrBIlYfpkpgcmR6Q5hpjITdibjd3RGZJsCAwEAIfkEBQoAAgAsAAAAABAAEAAABUyAAIKDAIQnHAYqsUnIoSgGwuUKJgiFkk4AiFWwgGDQzctgAiN3AYYn3UGCM7RyW5hQwwd4NIgUCgojgiCAKOhgXRoxAoqKQIKDVAIBcAEBIfkEBQoAAAAsAAAAABAAEAAAAlQAAiKcAAAqNJAKTZoCjWABDAAQEiwKVgSUCcUiCFYAAJ3AAECIlVoIAiEhADs='),
    COMPLETION: new Audio('data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/jtAIdcbGyo7cDcyFbeCFvZy+mj4LkeIaW4UEoBqYG6WbpBf4T/+xXd3YfV+vd27d+/dt8Yqc3beWKC/g/zj+iBR0jeBQRgEHAYs0QMxqAGoAFBchqLNwBQIQEwgiQQQRoQmmGrBIlYfpkpgcmR6Q5hpjITdibjd3RGZJsCAwEAIfkEBQoAAgAsAAAAABAAEAAABUyAAIKDAIQnHAYqsUnIoSgGwuUKJgiFkk4AiFWwgGDQzctgAiN3AYYn3UGCM7RyW5hQwwd4NIgUCgojgiCAKOhgXRoxAoqKQIKDVAIBcAEBIfkEBQoAAAAsAAAAABAAEAAAAlQAAiKcAAAqNJAKTZoCjWABDAAQEiwKVgSUCcUiCFYAAJ3AAECIlVoIAiEhADs=')
};

// Play sound effects based on event type
function playSound(type) {
    const audio = AUDIO[type];
    if (audio) {
        audio.currentTime = 0; // Reset audio to start
        audio.play().catch(error => console.log('Audio playback failed:', error));
    }
}