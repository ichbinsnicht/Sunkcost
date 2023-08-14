from bark import SAMPLE_RATE, generate_audio, preload_models
from scipy.io.wavfile import write as write_wav
from IPython.display import Audio

# download and load all models
preload_models()

# generate audio from text
text_prompt = """
    In this experiment, your earnings will depend on the decisions you make.

    You will start with $15. Depending on the decisions you make, you may win a $15 Starbucks gift card. This experiment has two stages: stage 1 and stage 2. In each stage, you will make a choice and receive a score and a multiplier, which will determine your earnings and your chance to win the $15 Starbucks gift card.

    Stage 1:
    A random multiplier, called Multiplier 1, will be either $1 or $10. Both are equally likely.
    You will choose a number between 0% and 50%, called Choice 1.
    You can adjust choice 1 by moving your mouse. Choice 1 will be locked in at the end of stage 1.
    Move your mouse to the right to increase choice 1. Move your mouse to the left to decrease choice 1.
    Score 1 will be either Choice 1 or a randomly selected number from 0% and 50%. Both are equally likely.
    Cost 1 will be calculated by multiplying Score 1 with Multiplier 1.

    Stage 2:
    A random multiplier, called Multiplier 2, will be either $1 or $10. Both are equally likely.
    You will choose a number between 0% and 50%, called Choice 2.
    You can adjust choice 2 by moving your mouse. Choice 2 will be locked in at the end of stage 2.
    Move your mouse to the right to increase choice 2. Move your mouse to the left to decrease choice 2.
    Score 2 will always equal Choice 2.
    Cost 2 will be calculated by multiplying Score 2 with Multiplier 2.
    Your earnings will be your initial $15 minus Cost 1 and Cost 2. Your probability of winning the $15 Starbucks gift card is the sum of Score 1 and Score 2.
"""
audio_array = generate_audio(text_prompt)

# save audio to disk
write_wav("instructionsMonetary.wav", SAMPLE_RATE, audio_array)
# MP3?
  
# play text in notebook
Audio(audio_array, rate=SAMPLE_RATE)