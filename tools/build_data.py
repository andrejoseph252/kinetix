#!/usr/bin/env python3
"""
Builds js/data.js and downloads/normalises exercise images.

Source photos + instructions: free-exercise-db (https://github.com/yuhonas/free-exercise-db),
released under the Unlicense (public domain).

Usage:
  python3 tools/build_data.py            # rebuild data.js + fetch any missing images
  (to add your own photos: save img/custom/<exercise-id>-0.jpg (start) and -1.jpg (end), then rerun)
  python3 tools/build_data.py --force    # re-download every image

Images are resized to 560px wide and converted to greyscale so every photo
shares one consistent look inside the app.

Row format:
  (source_id | None, display name, tags, equipment, requires, tier, default dose, cues[, custom steps])

  tags      space separated movement patterns + body regions
            patterns: prep mobility power squat hinge single lateral hpush vpush hpull vpull
                      core carry cond stretch smr prehab
                      lmob (loaded mobility) control (balance / body control) cars (joint circles) breath
                      iso (single-joint accessory) arms (biceps / triceps work)
            regions also: biceps triceps neck
            regions:  hips hams quads glutes groin calves ankles tspine shoulders chest lats back wrists
  equipment alternatives separated by "|" (any one is enough). "" = bodyweight only.
            bw kb db bb bar band bench cable mb roller trx cardio machine (gym machines incl. smith, dip station)
  requires  extra equipment that is ALWAYS needed (space separated), e.g. "bench"
  tier      1 = simple, 2 = standard, 3 = advanced/technical
  dose      "8" reps | "8/s" reps per side | "30s" hold | "30s/s" hold per side | "20m" distance
"""
import json, os, re, subprocess, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "img", "ex")
RAW = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/"

X = [
# ---------------- PREP / DYNAMIC WARM-UP ----------------
("Worlds_Greatest_Stretch", "World's Greatest Stretch", "prep mobility hips hams tspine", "", "", 1, "3/s",
 ["Long lunge, back knee off the floor", "Elbow to instep, then rotate and reach to the ceiling", "Slow and controlled — breathe into each position"]),
("Inchworm", "Inchworm", "prep mobility hams shoulders", "", "", 1, "6",
 ["Walk hands out to a plank, keep legs as straight as you can", "Brief push-up position, then walk feet to hands", "Squeeze glutes in the plank"]),
("Cat_Stretch", "Cat–Cow", "prep mobility back tspine", "", "", 1, "8",
 ["Hands under shoulders, knees under hips", "Round up segment by segment, then arch and look forward", "Move with your breath"]),
("Arm_Circles", "Arm Circles", "prep shoulders", "", "", 1, "10",
 ["Start small, build to big circles", "Both directions", "Keep ribs down, don't arch"]),
("Standing_Hip_Circles", "Standing Hip Circles", "prep mobility hips", "", "", 1, "6/s",
 ["Hold something for balance", "Knee up, open out to the side, then down", "Make the circle as big as you can control"]),
("Front_Leg_Raises", "Leg Swings — Front/Back", "prep hams hips", "", "", 1, "10/s",
 ["Hold a wall, stand tall", "Swing from the hip, gradually increase range", "Keep the standing leg straight"]),
("Side_Leg_Raises", "Leg Swings — Side to Side", "prep groin hips", "", "", 1, "10/s",
 ["Face a wall, hands on it", "Swing across the body and out", "Keep the hips square"]),
("Groiners", "Groiners", "prep mobility groin hips", "", "", 1, "5/s",
 ["From a push-up position, step foot outside the hand", "Sink the hips, hold a beat", "Alternate sides with control"]),
("Ankle_Circles", "Ankle Circles", "prep ankles", "", "", 1, "10/s",
 ["Draw big slow circles with the toes", "Both directions", "Good before any jumping"]),
("Dynamic_Chest_Stretch", "Dynamic Chest Opener", "prep chest shoulders", "", "", 1, "10",
 ["Arms out wide, squeeze shoulder blades together", "Hug yourself, then open again", "Rhythmic, not forced"]),
("Iron_Crosses_stretch", "Iron Cross", "mobility prep hips tspine", "", "", 1, "5/s",
 ["Lie on back, arms out in a T", "Swing one leg across to the opposite hand", "Keep both shoulders on the floor"]),
("Windmills", "Toe-Touch Windmills", "prep hams tspine", "", "", 1, "8/s",
 ["Wide stance, arms out", "Rotate and reach hand to opposite foot", "Other arm reaches to the sky"]),
("Kettlebell_Halo", "Kettlebell Halo", "prep mobility shoulders tspine lmob", "kb|db", "", 1, "5/s",
 ["Hold the bell by the horns, upside down", "Circle it tight around your head", "Squeeze glutes and abs so the low back doesn't arch"]),
("Band_Pull_Apart", "Band Pull-Apart", "prep prehab hpull shoulders", "band", "", 1, "15",
 ["Arms straight at shoulder height", "Pull the band to your chest by squeezing shoulder blades", "Slow on the way back"]),
("Fast_Skipping", "Skips", "prep cond", "", "", 1, "20m",
 ["Drive the knee up, land on the ball of the foot", "Opposite arm drives with the knee", "Stay light and bouncy"]),
("Single_Leg_Butt_Kick", "Butt Kicks", "prep quads", "", "", 1, "20m",
 ["Heel to glute, quick contacts", "Stay tall", "Arms pump like running"]),
("Carioca_Quick_Step", "Carioca", "prep lateral hips", "", "", 2, "15m/s",
 ["Move sideways crossing the trailing leg front then back", "Let the hips rotate, shoulders stay square", "Start slow, then speed up"]),
("Crossover_Reverse_Lunge", "Crossover Reverse Lunge", "prep mobility glutes hips", "", "", 1, "5/s",
 ["Step back and across behind you, like a curtsy", "Feel the stretch in the outside of the front hip", "Push through the front heel to stand"]),
("Scapular_Pull-Up", "Scap Pull-Up", "prep prehab vpull shoulders", "bar", "", 1, "8",
 ["Dead hang, arms straight the whole time", "Pull shoulders down away from the ears", "Pause, then relax back to the hang"]),
("Pelvic_Tilt_Into_Bridge", "Segmental Bridge", "prep mobility back glutes", "", "", 1, "8",
 ["Tuck the pelvis, then peel the spine up one vertebra at a time", "Lower the same way, top to bottom", "Great low-back wake-up"]),
("Round_The_World_Shoulder_Stretch", "Shoulder Pass-Through", "prep mobility shoulders chest", "", "", 1, "10",
 ["Hold a band, towel or stick wide", "Lift it over your head and behind, arms straight", "Narrow the grip as it gets easy"]),
("Spider_Crawl", "Spiderman Crawl", "prep core hips", "", "", 2, "6/s",
 ["Crawl forward bringing the knee to the elbow", "Keep the hips low", "Slow and controlled"]),
(None, "90/90 Hip Switch", "prep mobility hips glutes", "", "", 1, "6/s",
 ["Sit with both knees bent to 90°, one in front, one to the side", "Rotate both knees to the other side without using your hands if you can", "Sit tall, lead with the knees"],
 ["Sit on the floor. Place your front leg bent at 90° in front of you and your back leg bent at 90° out to the side.", "Keep your chest tall and hands lightly behind you (or off the floor to progress).", "Lift both knees and rotate them to the other side so the legs switch roles.", "Pause in each position, leaning gently over the front shin."]),
(None, "Thoracic Open Book", "prep mobility tspine chest", "", "", 1, "6/s",
 ["Lie on your side, knees bent up to hip height", "Open the top arm like a book, follow it with your eyes", "Keep knees together and on the floor"],
 ["Lie on your side with hips and knees bent to 90°, arms straight out in front, palms together.", "Keeping your knees stacked, sweep the top arm up and over to the other side.", "Let your upper back rotate and breathe out at the end range.", "Return slowly and repeat, then switch sides."]),
(None, "Deep Squat Hold", "prep mobility hips ankles groin", "", "", 1, "40s",
 ["Sit down into the deepest squat you can with heels down", "Elbows push knees out, chest up", "Hold something in front if needed"],
 ["Stand with feet slightly wider than shoulders, toes turned out a little.", "Sit all the way down into a deep squat, keeping heels on the floor.", "Use your elbows to gently press the knees out and keep your chest up.", "Shift side to side and breathe. Hold a door frame for support if needed."]),

# ---------------- POWER / PLYO / BALLISTIC ----------------
("Standing_Long_Jump", "Broad Jump", "power", "", "", 1, "4",
 ["Big arm swing, explode forward", "Land soft and quiet in a half squat", "Reset fully between reps"]),
("Freehand_Jump_Squat", "Jump Squat", "power squat", "", "", 1, "5",
 ["Quick dip to quarter squat, jump as high as you can", "Land soft, knees tracking over toes", "Quality over quantity"]),
("Front_Box_Jump", "Box Jump", "power", "", "bench", 1, "4",
 ["Jump up, land in the same position you took off from", "Step down — don't jump down", "Pick a box you can land quietly on"]),
("Lateral_Bound", "Lateral Bound", "power lateral", "", "", 2, "4/s",
 ["Push off one leg sideways, stick the landing on the other", "Hold the landing for 1 second", "Knee stays over the foot"]),
("Split_Jump", "Split Jump", "power single", "", "", 2, "4/s",
 ["Start in a lunge, jump and switch legs in the air", "Land softly in the opposite lunge", "Stay tall through the torso"]),
("Knee_Tuck_Jump", "Tuck Jump", "power", "", "", 2, "5",
 ["Jump and pull knees to chest", "Land softly and rebound", "Stop if landings get loud"]),
("Hurdle_Hops", "Continuous Hops", "power", "", "", 2, "5",
 ["Two-footed hops forward, minimal ground contact", "Stiff ankles, quick off the floor", "Arms drive each hop"]),
("Single-Leg_Lateral_Hop", "Single-Leg Lateral Hop", "power lateral ankles", "", "", 2, "5/s",
 ["Hop side to side on one leg over a line", "Stick each landing briefly at first", "Great for ankle stability"]),
("Plyo_Push-up", "Plyo Push-Up", "power hpush", "", "", 3, "5",
 ["Explode up so the hands leave the floor", "Land soft with bent elbows", "Do from knees or an incline to start"]),
("Overhead_Slam", "Med Ball Slam", "power cond core", "mb", "", 1, "6",
 ["Reach tall, then slam the ball with your whole body", "Hinge at the hips as you slam", "Catch on the bounce or pick up and repeat"]),
("Medicine_Ball_Chest_Pass", "Med Ball Chest Pass", "power hpush", "mb", "", 1, "6",
 ["Throw against a wall from the chest", "Step into each throw", "Max intent every rep"]),
("Medicine_Ball_Scoop_Throw", "Rotational Scoop Toss", "power core", "mb", "", 2, "5/s",
 ["Side-on to a wall, load the back hip", "Rotate hard and release from the hip", "Power comes from the legs, not the arms"]),
("Backward_Medicine_Ball_Throw", "Backward Med Ball Throw", "power hinge", "mb", "", 2, "4",
 ["Hinge down with the ball between the knees", "Explode up and throw it backwards overhead", "Full hip extension"]),
("One-Arm_Kettlebell_Swings", "Kettlebell Swing", "power hinge cond", "kb", "", 1, "12",
 ["Hike the bell back, hinge — don't squat", "Snap the hips forward, bell floats to chest height", "Plank at the top: glutes and abs tight", "Two hands or one hand — same pattern"]),
("Kettlebell_Hang_Clean", "Kettlebell Clean", "power hinge", "kb", "", 2, "5/s",
 ["Small hike, drive the hips", "Keep the bell close, elbow tight to the ribs", "Let the bell roll around the hand into the rack — no banging"]),
("One-Arm_Kettlebell_Snatch", "Kettlebell Snatch", "power cond hinge vpush", "kb", "", 3, "5/s",
 ["Hike, drive the hips, high pull", "Punch through at the top so the bell doesn't flip onto the wrist", "Master the swing and clean first"]),
("One-Arm_Kettlebell_Push_Press", "Kettlebell Push Press", "power vpush", "kb", "", 2, "5/s",
 ["Bell in the rack, short dip with the knees", "Drive the legs and punch it overhead", "Lower with control back to the rack"]),
("Dumbbell_Clean", "Dumbbell Hang Clean", "power hinge", "db", "", 2, "5",
 ["Hinge with dumbbells at the knees", "Jump-shrug and pull them up close", "Catch on the shoulders in a quarter squat"]),
("Vertical_Swing", "Dumbbell Swing", "power hinge cond", "db", "", 1, "12",
 ["Hold one dumbbell by the end", "Hinge and hike back, then snap the hips", "Arms are just ropes — hips do the work"]),
("Hang_Clean", "Barbell Hang Clean", "power hinge", "bb", "", 3, "3",
 ["Bar at mid-thigh, hinge slightly", "Jump and shrug, pull yourself under", "Fast elbows into the front rack"]),
("Push_Press", "Barbell Push Press", "power vpush", "bb", "", 2, "4",
 ["Bar in the front rack, short vertical dip", "Drive with the legs and press to lockout", "Head through at the top"]),
("Star_Jump", "Star Jumps", "cond prep power", "", "", 1, "10",
 ["Jump out into a big X shape", "Land softly with knees bent", "Keep a steady rhythm"]),

# ---------------- SQUAT ----------------
("Bodyweight_Squat", "Bodyweight Squat", "squat prep", "", "", 1, "12",
 ["Feet shoulder-width, sit between the hips", "Chest up, knees track over toes", "Go as deep as you control"]),
("Goblet_Squat", "Goblet Squat", "squat", "kb|db", "", 1, "8",
 ["Bell at the chest, elbows down", "Sit down between the knees, chest tall", "Pause at the bottom for a better position"]),
("Front_Squats_With_Two_Kettlebells", "Double Kettlebell Front Squat", "squat", "kb", "", 2, "6",
 ["Two bells in the rack, wrists straight", "Brace hard, sit down tall", "Drive up through the whole foot"]),
("Dumbbell_Squat", "Dumbbell Squat", "squat", "db", "", 1, "10",
 ["Dumbbells at your sides", "Sit back and down, chest up", "Full foot pressure"]),
("Dumbbell_Squat_To_A_Bench", "Box Squat", "squat", "|db|kb", "bench", 1, "10",
 ["Sit back to the box, touch lightly", "Don't relax on the box", "Stand up driving the knees out"]),
("Barbell_Squat", "Back Squat", "squat", "bb", "", 2, "5",
 ["Bar on the upper back, brace before you descend", "Knees out, sit down between the hips", "Drive up keeping chest and hips rising together"]),
("Front_Barbell_Squat", "Front Squat", "squat", "bb", "", 3, "5",
 ["Elbows high, bar on the shoulders", "Stay upright, sit straight down", "Lead with the elbows on the way up"]),
("Kettlebell_Thruster", "Kettlebell Thruster", "squat vpush cond", "kb|db", "", 2, "8",
 ["Front squat into a press in one movement", "Use the drive from the legs to press", "Lower the bell back to the rack as you sit"]),

# ---------------- HINGE ----------------
("Butt_Lift_Bridge", "Glute Bridge", "hinge glutes prep", "", "", 1, "12",
 ["Feet flat, heels close to glutes", "Drive the hips up by squeezing glutes", "Ribs down, don't arch the low back"]),
("Single_Leg_Glute_Bridge", "Single-Leg Glute Bridge", "hinge glutes single", "", "", 1, "10/s",
 ["One foot planted, other knee to chest", "Push through the heel, hips level", "Pause at the top"]),
(None, "Kettlebell Deadlift", "hinge", "kb|db", "", 1, "10",
 ["Bell between the feet, push hips back", "Flat back, lats tight, grip and pull the slack out", "Stand tall by driving the floor away"],
 ["Stand with the kettlebell between your feet, feet hip-width apart.", "Push your hips back and bend your knees slightly to grab the handle with both hands. Keep your back flat.", "Pull your shoulders down and tighten your lats, then drive through your feet to stand tall.", "Squeeze your glutes at the top, then hinge back down with control."]),
("Kettlebell_One-Legged_Deadlift", "Single-Leg RDL", "hinge single control", "|kb|db", "", 2, "8/s",
 ["Hips square, reach the free leg back long", "Weight in the hand opposite the standing leg", "Soft standing knee, flat back"]),
("Stiff-Legged_Dumbbell_Deadlift", "Dumbbell Romanian Deadlift", "hinge hams", "db|kb", "", 1, "10",
 ["Soft knees, push the hips back", "Weights slide down the thighs", "Stop when the hamstrings are loaded, back stays flat"]),
("Romanian_Deadlift", "Romanian Deadlift", "hinge hams", "bb", "", 2, "8",
 ["Start standing, push hips back", "Bar stays in contact with the legs", "Feel the hamstrings, then drive hips forward"]),
("Barbell_Deadlift", "Deadlift", "hinge", "bb", "", 2, "5",
 ["Bar over mid-foot, shins to bar", "Chest up, pull the slack out, then push the floor away", "Lock out with glutes, not by leaning back"]),
("Trap_Bar_Deadlift", "Trap Bar Deadlift", "hinge", "bb", "", 1, "5",
 ["Stand in the centre, grab the handles", "Hips down, chest up, brace", "Push the floor away"]),
("Barbell_Hip_Thrust", "Hip Thrust", "hinge glutes", "bb|db", "bench", 2, "10",
 ["Upper back on the bench, weight in the hip crease", "Drive hips to full extension", "Chin tucked, ribs down"]),
("Band_Good_Morning", "Band Good Morning", "hinge hams", "band", "", 1, "12",
 ["Stand on the band, loop it behind the neck", "Hinge back with a flat back", "Snap the hips forward"]),
("Pull_Through", "Cable Pull-Through", "hinge glutes", "cable|band", "", 1, "12",
 ["Face away, rope between the legs", "Hinge back, then drive the hips through", "Squeeze glutes at the top"]),
("Natural_Glute_Ham_Raise", "Nordic Curl", "hinge hams", "", "", 3, "4",
 ["Anchor the heels, kneel tall", "Lower forward as slowly as possible", "Catch with your hands, push back up"]),

# ---------------- SINGLE LEG ----------------
("Dumbbell_Rear_Lunge", "Reverse Lunge", "single squat", "|db|kb", "", 1, "8/s",
 ["Step back, drop the back knee toward the floor", "Most weight in the front heel", "Torso tall, drive up through the front leg"]),
("Dumbbell_Lunges", "Forward Lunge", "single squat", "|db|kb", "", 1, "8/s",
 ["Step out long, both knees to 90°", "Front knee tracks over the toes", "Push back to the start"]),
("Split_Squat_with_Dumbbells", "Split Squat", "single squat", "|db|kb", "", 1, "8/s",
 ["Staggered stance, feet stay put", "Straight down and up like an elevator", "Back knee kisses the floor"]),
("One_Leg_Barbell_Squat", "Bulgarian Split Squat", "single squat", "|db|kb|bb", "bench", 2, "8/s",
 ["Rear foot up on a bench", "Lean slightly forward for glutes, upright for quads", "Front foot far enough out so the heel stays down"]),
("Dumbbell_Step_Ups", "Step-Up", "single squat", "|db|kb", "bench", 1, "8/s",
 ["Whole foot on the box", "Drive through the top leg — don't push off the bottom one", "Control the step down"]),
("Step-up_with_Knee_Raise", "Step-Up with Knee Drive", "single power", "", "bench", 1, "8/s",
 ["Step up and drive the opposite knee high", "Stand tall, balance for a beat", "Athletic sprint posture"]),
("Lunge_Pass_Through", "Lunge Pass-Through", "single core", "kb", "", 2, "6/s",
 ["Lunge and pass the bell under the front leg", "Alternate legs each rep", "Keep the torso upright"]),
("Single-Leg_High_Box_Squat", "Single-Leg Box Squat", "single squat", "", "bench", 2, "6/s",
 ["Stand on one leg in front of a box", "Sit back to the box with control", "Stand without rocking"]),
("Kettlebell_Pistol_Squat", "Pistol Squat", "single squat mobility", "|kb", "", 3, "4/s",
 ["One leg out in front, sit all the way down", "Bell held out front as a counterweight", "Use a box to limit depth while learning"]),

# ---------------- LATERAL ----------------
("Barbell_Side_Split_Squat", "Lateral Lunge", "lateral single groin", "|db|kb|bb", "", 1, "6/s",
 ["Wide stance, sit into one hip", "Other leg straight, both feet flat", "Push back to the middle"]),
(None, "Cossack Squat", "lateral mobility groin hips lmob", "|kb|db", "", 2, "5/s",
 ["Very wide stance, sit deep into one side", "Straight leg toes point up", "Hold a bell at the chest as a counterbalance"],
 ["Take a very wide stance with toes slightly turned out.", "Shift your weight to one side and sit down deep into that hip, keeping the heel down.", "Let the straight leg rotate so the toes point up.", "Keep your chest tall, then push back up through the middle to the other side."]),
("Monster_Walk", "Banded Monster Walk", "lateral glutes prep prehab", "band", "", 1, "10/s",
 ["Band around the knees or ankles", "Half squat, step out wide and forward", "Don't let the knees cave"]),
("Side_Bridge", "Side Plank", "core lateral", "", "", 1, "30s/s",
 ["Elbow under the shoulder, body in a straight line", "Push the hip up to the ceiling", "Bend the bottom knee to make it easier"]),
(None, "Copenhagen Plank", "core lateral groin control", "", "bench", 2, "20s/s",
 ["Top leg on a bench, side plank", "Lift the hips up — the inside of the top leg works", "Use the knee on the bench to make it easier"],
 ["Lie on your side next to a bench, with your top leg resting on it (knee for easier, ankle for harder).", "Prop up on your elbow and lift your hips until your body is straight.", "The bottom leg can hang or lift to the bench.", "Hold, keeping your hips high and stacked."]),

# ---------------- HORIZONTAL PUSH ----------------
("Pushups", "Push-Up", "hpush", "", "", 1, "10",
 ["Hands under shoulders, body in a straight line", "Elbows at about 45°, chest to the floor", "Squeeze glutes so the hips don't sag"]),
("Incline_Push-Up", "Incline Push-Up", "hpush", "", "bench", 1, "12",
 ["Hands on a bench or box", "Full range, chest to the edge", "Lower the incline as you get stronger"]),
("Push-Ups_With_Feet_Elevated", "Feet-Elevated Push-Up", "hpush", "", "bench", 2, "8",
 ["Feet on a bench", "Keep the hips in line", "Harder on the shoulders and upper chest"]),
("Push_Up_to_Side_Plank", "Push-Up to Side Plank", "hpush core", "", "", 2, "5/s",
 ["Push-up, then rotate into a side plank", "Stack the feet or stagger them", "Back to the centre and switch sides"]),
("Dumbbell_Bench_Press", "Dumbbell Bench Press", "hpush", "db", "bench", 1, "8",
 ["Shoulder blades pinched on the bench", "Lower to the chest with elbows at 45°", "Press up and slightly together"]),
("Dumbbell_Floor_Press", "Dumbbell Floor Press", "hpush", "db", "", 1, "10",
 ["Lie on the floor, knees bent", "Lower until the upper arms touch the floor", "Pause, then press"]),
("One-Arm_Kettlebell_Floor_Press", "Kettlebell Floor Press", "hpush core", "kb", "", 1, "8/s",
 ["Bell on the back of the forearm", "Lower until the elbow touches the floor", "Don't let the body twist"]),
("Barbell_Bench_Press_-_Medium_Grip", "Bench Press", "hpush", "bb", "bench", 2, "6",
 ["Eyes under the bar, shoulder blades back and down", "Touch the lower chest, elbows tucked", "Drive the feet into the floor"]),

# ---------------- VERTICAL PUSH ----------------
("Alternating_Kettlebell_Press", "Kettlebell Overhead Press", "vpush", "kb", "", 1, "6/s",
 ["Start in the rack, forearm vertical", "Glutes tight, press straight up", "Bicep finishes by the ear"]),
("Dumbbell_One-Arm_Shoulder_Press", "Single-Arm Dumbbell Press", "vpush core", "db", "", 1, "8/s",
 ["Stand tall, brace against the lean", "Press straight up", "Slow lower"]),
("Standing_Dumbbell_Press", "Dumbbell Overhead Press", "vpush", "db", "", 1, "8",
 ["Dumbbells at the shoulders", "Press up, don't arch the back", "Lockout over the head"]),
("Standing_Military_Press", "Overhead Press", "vpush", "bb", "", 2, "5",
 ["Bar on the front of the shoulders", "Squeeze glutes, press straight up — move your head out of the way", "Head through at the top"]),
("Shoulder_Press_-_With_Bands", "Band Overhead Press", "vpush", "band", "", 1, "12",
 ["Stand on the band, hands at the shoulders", "Press overhead to lockout", "Control the band back down"]),
("Handstand_Push-Ups", "Handstand Push-Up", "vpush", "", "", 3, "4",
 ["Kick up against a wall", "Lower head to the floor with control", "Use a pike push-up to build up to it"]),
("Kettlebell_Windmill", "Kettlebell Windmill", "core mobility vpush shoulders hams lmob control", "kb", "", 2, "5/s",
 ["Bell locked out overhead, eyes on it", "Push the hip out and slide the other hand down the leg", "Arm stays vertical the whole time"]),

# ---------------- HORIZONTAL PULL ----------------
("Inverted_Row_with_Straps", "Inverted Row", "hpull", "trx|bb|bar", "", 1, "10",
 ["Body straight like a plank", "Pull the chest to the hands", "Feet further forward = harder"]),
("One-Arm_Dumbbell_Row", "Single-Arm Dumbbell Row", "hpull", "db", "bench", 1, "10/s",
 ["Hand and knee on the bench, flat back", "Pull the elbow to the hip", "Don't twist the torso"]),
("One-Arm_Kettlebell_Row", "Kettlebell Row", "hpull", "kb", "", 1, "10/s",
 ["Staggered stance, hinge forward", "Row to the hip, elbow close", "Pause and squeeze at the top"]),
("Bent_Over_Barbell_Row", "Barbell Row", "hpull", "bb", "", 2, "8",
 ["Hinge to about 45°, flat back", "Pull the bar to the belly button", "Control the lower"]),
("Seated_Cable_Rows", "Seated Cable Row", "hpull", "cable", "", 1, "10",
 ["Sit tall, slight lean", "Pull to the stomach, shoulders down and back", "Let the shoulder blades move forward on the return"]),
("Dumbbell_Incline_Row", "Chest-Supported Row", "hpull", "db", "bench", 1, "10",
 ["Chest on an incline bench", "Row both dumbbells to the hips", "No momentum"]),
("Alternating_Renegade_Row", "Renegade Row", "hpull core", "kb|db", "", 3, "6/s",
 ["Push-up position on the bells, wide feet", "Row one side without twisting the hips", "Push into the floor with the other hand"]),
("Face_Pull", "Face Pull", "prehab hpull shoulders", "cable|band", "", 1, "15",
 ["Rope at face height", "Pull to the eyes, hands finish beside the ears", "Thumbs point back"]),
(None, "Prone Y-T-W Raise", "prehab hpull shoulders back prep", "", "", 1, "5",
 ["Lie face down, thumbs up", "Lift arms into a Y, then T, then W — that's one rep", "Squeeze the shoulder blades, keep the neck long"],
 ["Lie face down with your forehead resting on a towel and arms overhead, thumbs pointing up.", "Lift your arms into a Y shape by squeezing your shoulder blades. Pause, then lower.", "Move your arms out to a T, lift and pause. Then bend the elbows into a W, pull them back and pause.", "Y + T + W = one rep. Light and controlled."]),
("External_Rotation_with_Band", "Band External Rotation", "prehab shoulders", "band", "", 1, "12/s",
 ["Elbow pinned to the side at 90°", "Rotate the hand outward", "Slow and controlled"]),

# ---------------- VERTICAL PULL ----------------
("Pullups", "Pull-Up", "vpull", "bar", "", 2, "5",
 ["Dead hang, shoulders engaged", "Pull the chest to the bar", "Full lower each rep"]),
("Chin-Up", "Chin-Up", "vpull", "bar", "", 2, "6",
 ["Palms facing you, shoulder-width", "Chin over the bar", "Slow 3-second lower"]),
("Band_Assisted_Pull-Up", "Band-Assisted Pull-Up", "vpull", "bar", "band", 1, "6",
 ["Loop a band on the bar under the knee or foot", "Same form as a full pull-up", "Use a thinner band as you get stronger"]),
("Wide-Grip_Lat_Pulldown", "Lat Pulldown", "vpull", "cable", "", 1, "10",
 ["Slight lean back, chest up", "Pull the bar to the upper chest", "Elbows drive down to the ribs"]),
("One_Handed_Hang", "Dead Hang", "vpull mobility stretch shoulders lats", "bar", "", 1, "30s",
 ["Hang with arms straight, relax the shoulders", "Breathe and let the lats stretch", "Builds grip and opens up the shoulders"]),

# ---------------- CORE ----------------
("Plank", "Plank", "core", "", "", 1, "30s",
 ["Elbows under the shoulders", "Squeeze glutes, tuck the ribs", "Straight line from head to heels"]),
("Dead_Bug", "Dead Bug", "core prep", "", "", 1, "6/s",
 ["Lower back pressed into the floor", "Extend opposite arm and leg slowly", "Breathe out as you reach"]),
(None, "Bird Dog", "core prep back control", "", "", 1, "6/s",
 ["On all fours, reach opposite arm and leg long", "Hips stay level — imagine a glass of water on your back", "Pause 2 seconds, then switch"],
 ["Start on hands and knees, hands under shoulders and knees under hips.", "Brace your core and slowly extend one arm forward and the opposite leg back.", "Keep your hips and shoulders level and your back flat.", "Pause, return to the start and switch sides."]),
(None, "Hollow Hold", "core", "", "", 2, "20s",
 ["Low back glued to the floor", "Arms and legs long, just off the floor", "Bend the knees to make it easier"],
 ["Lie on your back with your arms overhead.", "Press your lower back into the floor and lift your shoulders, arms and legs slightly off the ground.", "Keep everything long and tight like a banana shape.", "Hold, breathing shallowly. Tuck the knees in if your back lifts."]),
("Pallof_Press", "Pallof Press", "core", "cable|band", "", 1, "10/s",
 ["Side-on to the anchor, hands at the chest", "Press straight out and resist the rotation", "Hold 2 seconds at full extension"]),
("Russian_Twist", "Russian Twist", "core", "|mb|kb|db", "", 1, "10/s",
 ["Sit tall, lean back slightly", "Rotate from the ribs, not just the arms", "Feet down to make it easier"]),
("Mountain_Climbers", "Mountain Climbers", "core cond", "", "", 1, "20/s",
 ["Plank position, drive the knees to the chest", "Hips stay low", "Quick but controlled"]),
("Hanging_Leg_Raise", "Hanging Leg Raise", "core", "bar", "", 3, "8",
 ["Dead hang, no swinging", "Lift the legs by curling the pelvis", "Bent knees to make it easier"]),
("Kettlebell_Turkish_Get-Up_Lunge_style", "Turkish Get-Up", "core mobility shoulders control", "kb|db", "", 2, "2/s",
 ["Eyes on the bell, arm locked the whole time", "Roll to elbow → hand → bridge → sweep the leg → lunge → stand", "Reverse every step on the way down", "Start with a shoe on your fist"]),
("Kettlebell_Figure_8", "Kettlebell Figure-8", "core", "kb", "", 2, "8/s",
 ["Half squat, pass the bell between the legs", "Swap hands around each leg", "Flat back, eyes forward"]),
("Superman", "Superman", "core back", "", "", 1, "10",
 ["Lie face down, arms overhead", "Lift arms, chest and legs together", "Hold 2 seconds at the top"]),
("Reverse_Crunch", "Reverse Crunch", "core", "", "", 1, "12",
 ["Lie down, knees up at 90°", "Curl the hips off the floor toward the chest", "Lower slowly"]),
("Barbell_Ab_Rollout_-_On_Knees", "Ab Rollout", "core", "bb", "", 2, "8",
 ["Kneel holding a bar or wheel", "Roll out as far as you can without the back sagging", "Pull back with the abs"]),
(None, "Bear Crawl", "core cond shoulders", "", "", 1, "20m",
 ["Hands and feet, knees hover an inch off the floor", "Opposite hand and foot move together", "Keep the back flat and hips low"],
 ["Start on hands and knees, then lift your knees an inch off the floor.", "Crawl forward moving the opposite hand and foot together.", "Keep your back flat and hips level — don't let them pike up.", "Crawl forward, backward or sideways."]),

# ---------------- CARRY ----------------
("Farmers_Walk", "Farmer's Carry", "carry core", "kb|db|bb", "", 1, "30m",
 ["Heavy weight in each hand", "Stand tall, shoulders down", "Short quick steps"]),
(None, "Suitcase Carry", "carry core control", "kb|db", "", 1, "20m/s",
 ["Weight in one hand only", "Don't lean — stay perfectly tall", "Brace the opposite side"],
 ["Pick up one heavy kettlebell or dumbbell in one hand.", "Stand tall with your shoulders level — resist leaning toward the weight.", "Walk with short, controlled steps.", "Switch hands and repeat."]),

# ---------------- CONDITIONING ----------------
(None, "Burpee", "cond", "", "", 1, "8",
 ["Squat, kick back to a plank, chest to the floor", "Jump the feet in and jump up", "Step back and step in instead of jumping to scale"],
 ["Squat down and put your hands on the floor.", "Jump or step your feet back into a plank and lower your chest to the floor.", "Push up and jump or step your feet back under you.", "Stand and jump, clapping overhead."]),
("Rope_Jumping", "Jump Rope", "cond prep calves", "", "", 1, "60s",
 ["Small hops off the balls of the feet", "Wrists turn the rope, elbows close", "No rope? Shadow jump"]),
("Kettlebell_Sumo_High_Pull", "Kettlebell Sumo High Pull", "cond power", "kb", "", 2, "10",
 ["Wide stance, bell between the feet", "Drive the hips and pull the bell to the chin", "Elbows high"]),
("Wind_Sprints", "Sprints", "cond power", "", "", 2, "40m",
 ["Build up — start at 70% the first few", "Drive the arms, tall posture", "Walk back to recover"]),
("Rowing_Stationary", "Row / Bike Intervals", "cond", "cardio", "", 1, "60s",
 ["Rower or bike", "Hard but sustainable for the work interval", "Easy pace to recover"]),

# ---------------- STRETCH (static) ----------------
("Kneeling_Hip_Flexor", "Kneeling Hip Flexor Stretch", "stretch hips quads", "", "", 1, "40s/s",
 ["Half-kneeling, tuck the pelvis under", "Squeeze the back glute and shift forward slightly", "Reach the arm up for more stretch"]),
("Intermediate_Hip_Flexor_and_Quad_Stretch", "Couch Stretch", "stretch hips quads", "", "", 2, "45s/s",
 ["Back knee in the corner of a wall or couch, shin up the wall", "Front foot forward, squeeze the back glute", "Sit tall slowly"]),
(None, "Pigeon Stretch", "stretch hips glutes", "", "", 1, "45s/s",
 ["Front shin across the body, back leg long", "Hips square to the floor", "Fold forward over the front leg to deepen"],
 ["From all fours, bring one knee forward behind the same-side wrist with the shin angled across your body.", "Slide the other leg straight back and settle the hips toward the floor.", "Stay upright or fold forward over the front leg.", "Breathe and relax into it. Put a cushion under the hip if it doesn't reach the floor."]),
("Ankle_On_The_Knee", "Figure-4 Stretch", "stretch glutes hips", "", "", 1, "40s/s",
 ["Lie on your back, ankle on the opposite knee", "Pull the bottom thigh toward you", "Keep the top foot flexed"]),
("Knee_Across_The_Body", "Knee Across the Body", "stretch glutes back", "", "", 1, "30s/s",
 ["Lie down, pull one knee across the body", "Keep both shoulders down", "Look the other way"]),
("90_90_Hamstring", "90/90 Hamstring Stretch", "stretch hams", "", "", 1, "40s/s",
 ["Lie on your back, hold behind the thigh at 90°", "Straighten the knee until you feel the stretch", "Flex the foot"]),
("Seated_Floor_Hamstring_Stretch", "Seated Hamstring Stretch", "stretch hams back", "", "", 1, "40s/s",
 ["One leg out, the other foot to the inner thigh", "Hinge from the hips toward the toes", "Long spine, don't round hard"]),
("Standing_Hamstring_and_Calf_Stretch", "Standing Hamstring & Calf Stretch", "stretch hams calves", "", "", 1, "30s/s",
 ["Heel forward, toes up", "Hinge forward with a flat back", "Pull the toes back for more calf"]),
("The_Straddle", "Straddle Stretch", "stretch groin hams", "", "", 1, "45s",
 ["Legs wide, toes up", "Walk the hands forward from the hips", "Back stays long"]),
("Side_Lying_Groin_Stretch", "Butterfly Stretch", "stretch groin hips", "", "", 1, "40s",
 ["Soles of the feet together", "Let the knees fall open", "Hinge forward gently"]),
("Calf_Stretch_Hands_Against_Wall", "Wall Calf Stretch", "stretch calves ankles", "", "", 1, "30s/s",
 ["Hands on the wall, back leg straight, heel down", "Lean into the wall", "Bend the back knee to target the soleus"]),
("Standing_Soleus_And_Achilles_Stretch", "Soleus Stretch", "stretch calves ankles", "", "", 1, "30s/s",
 ["Staggered stance, both knees bent", "Sink down keeping the back heel on the floor", "Feel it low in the calf"]),
("On_Your_Side_Quad_Stretch", "Side-Lying Quad Stretch", "stretch quads hips", "", "", 1, "30s/s",
 ["Lie on your side, grab the top ankle", "Pull the heel toward the glute", "Push the hip forward"]),
("Childs_Pose", "Child's Pose", "stretch back lats", "", "", 1, "45s",
 ["Knees wide, sit back on the heels", "Reach the arms long", "Breathe into the back of the ribs"]),
("One_Arm_Against_Wall", "Wall Lat Stretch", "stretch lats shoulders", "", "", 1, "30s/s",
 ["Hand on the wall, step back and hinge", "Push the hips away", "Feel it along the side of the back"]),
("Chest_And_Front_Of_Shoulder_Stretch", "Doorway Chest Stretch", "stretch chest shoulders", "", "", 1, "30s/s",
 ["Forearm on a door frame, elbow at shoulder height", "Step through gently", "Don't let the shoulder roll forward"]),
("Shoulder_Stretch", "Cross-Body Shoulder Stretch", "stretch shoulders", "", "", 1, "30s/s",
 ["Pull the arm across the chest", "Keep the shoulder down", "Breathe and relax"]),
("Triceps_Stretch", "Overhead Triceps Stretch", "stretch shoulders lats", "", "", 1, "30s/s",
 ["Reach the hand down the back", "Gently press the elbow back", "Stay tall"]),
("Spinal_Stretch", "Seated Spinal Twist", "stretch back tspine glutes", "", "", 1, "30s/s",
 ["Sit tall, cross one leg over", "Twist toward the bent knee", "Lengthen up, then rotate"]),
("Upper_Back_Stretch", "Upper Back Stretch", "stretch back tspine", "", "", 1, "30s",
 ["Clasp the hands in front", "Round the upper back and push the hands away", "Tuck the chin"]),
("Standing_Lateral_Stretch", "Standing Side Bend", "stretch lats back", "", "", 1, "20s/s",
 ["Reach one arm overhead and lean away", "Hips stay centred", "Long through the side of the body"]),
("Hug_Knees_To_Chest", "Knees to Chest", "stretch back glutes", "", "", 1, "30s",
 ["Lie on your back, hug both knees in", "Rock gently side to side", "Relax the low back"]),
("Kneeling_Forearm_Stretch", "Wrist & Forearm Stretch", "stretch wrists", "", "", 1, "30s",
 ["Kneel, palms down, fingers pointing to the knees", "Gently lean back", "Ease off if it pinches"]),
("Upward_Stretch", "Overhead Reach", "stretch shoulders lats", "", "", 1, "20s",
 ["Clasp the hands, reach up tall", "Ribs down", "Breathe"]),

# ---------------- SMR (foam roller) ----------------
("Quadriceps-SMR", "Foam Roll — Quads", "smr quads", "roller", "", 1, "45s/s",
 ["Face down on the roller", "Roll from hip to above the knee", "Pause on tight spots"]),
("Hamstring-SMR", "Foam Roll — Hamstrings", "smr hams", "roller", "", 1, "45s/s",
 ["Sit on the roller, hands behind", "Cross one leg over for more pressure", "Slow passes"]),
("Calves-SMR", "Foam Roll — Calves", "smr calves", "roller", "", 1, "45s/s",
 ["Roller under the calf", "Turn the foot in and out", "Stack the legs for more pressure"]),
("Rhomboids-SMR", "Foam Roll — Upper Back", "smr back tspine", "roller", "", 1, "45s",
 ["Roller under the shoulder blades, hands across the chest", "Lift the hips and roll slowly", "Avoid the lower back"]),
("Latissimus_Dorsi-SMR", "Foam Roll — Lats", "smr lats", "roller", "", 1, "40s/s",
 ["Lie on your side, roller under the armpit", "Arm reaching overhead", "Roll down the side of the back"]),
("Iliotibial_Tract-SMR", "Foam Roll — Outer Thigh", "smr quads hips", "roller", "", 1, "40s/s",
 ["Lie on your side on the roller", "Top foot in front for support", "Go slow — it's sensitive"]),
("Piriformis-SMR", "Foam Roll — Glutes", "smr glutes hips", "roller", "", 1, "40s/s",
 ["Sit on the roller, ankle over the opposite knee", "Lean into the crossed side", "Small slow rolls"]),
("Adductor", "Foam Roll — Adductors", "smr groin", "roller", "", 1, "40s/s",
 ["Face down, one leg out to the side on the roller", "Roll the inside of the thigh", "Slow passes"]),
]

# ---------------- JOINT CARs & MOBILITY (added) ----------------
X += [
(None, "Hip CARs", "prep mobility cars hips", "", "", 1, "3/s",
 ["Hold a wall, brace everything except the moving hip", "Knee up, out, rotate back and down — biggest circle you own", "Slow: 10+ seconds per circle, both directions"]),
(None, "Shoulder CARs", "prep mobility cars shoulders", "", "", 1, "3/s",
 ["Make a tight fist, squeeze glutes and abs", "Draw the biggest slow circle you can with a straight arm", "Ribs stay down — only the shoulder moves"]),
(None, "Quadruped Scapular CARs", "prep mobility cars shoulders tspine", "", "", 1, "5",
 ["On all fours, elbows locked", "Slowly circle the shoulder blades: forward, up, back, down", "Both directions — chest moves, arms don't bend"]),
(None, "Thread the Needle", "prep mobility tspine shoulders", "", "", 1, "6/s",
 ["On all fours, reach one arm under the opposite armpit", "Let the shoulder and ear sink to the floor", "Then open the arm to the ceiling, eyes follow the hand"]),
(None, "Knee-to-Wall Ankle Rocks", "prep mobility ankles calves", "", "", 1, "10/s",
 ["Half-kneel facing a wall, front foot a hand away", "Drive the knee over the toes to touch the wall", "Heel stays glued down — move the foot back as it frees up"]),
(None, "Adductor Rock-Back", "prep mobility groin hips", "", "", 1, "8/s",
 ["On all fours, one leg straight out to the side", "Sit the hips back towards the heel, flat back", "Feel the stretch along the inner thigh, then return"]),
(None, "Wall Slides", "prep mobility prehab shoulders tspine", "", "", 1, "10",
 ["Back, head and arms against the wall in a goalpost", "Slide the arms up without the low back arching", "Pull the elbows down into the ribs to return"]),
(None, "Shinbox Get-Up", "mobility control hips glutes", "", "", 2, "4/s",
 ["Sit in a 90/90 position", "Drive the front shin into the floor and rise to tall kneeling", "Lower with control, switch sides — hands off the floor if you can"]),
(None, "Jefferson Curl", "mobility lmob hams back", "|kb|db", "", 2, "6",
 ["Stand on a box or floor, light weight or none", "Chin to chest, roll down one vertebra at a time", "Roll back up slowly — very light, very slow"]),

# ---------------- LOADED MOBILITY & BODY CONTROL (added) ----------------
(None, "Goblet Prying Squat", "lmob mobility squat hips groin ankles", "kb|db", "", 1, "5",
 ["Hold the bell at the chest, sink into a deep squat", "Hold ~5s at the bottom, elbows gently pry the knees open", "Shift weight side to side across the ankles, then stand"]),
(None, "Half-Kneeling KB Windmill", "lmob control core shoulders hams", "kb", "", 2, "5/s",
 ["Half-kneel, bell locked out overhead on the front-leg side", "Eyes on the bell, hinge the hips diagonally back", "Free hand to the mat, then return tall — arm stays vertical"]),
(None, "Kettlebell Arm Bar", "lmob control shoulders tspine", "kb", "", 2, "3/s",
 ["Lie down, press the bell up, cross the opposite leg over", "Roll to your side then towards your belly, arm vertical", "Hold 2–3 breaths, shoulder packed, then roll back"]),
(None, "KB Pullover Dead Bug", "core control", "kb|db", "", 1, "4/s",
 ["On your back, knees at 90°, bell over the chest", "Lower the bell behind the head as one heel reaches to the floor", "Low back stays pressed flat — slow and controlled"]),
(None, "Single-Leg RDL Airplane", "control single hinge hips glutes", "", "", 2, "5/s",
 ["Balance on one leg, hinge to a horizontal T", "Rotate the pelvis open to the side wall, then closed to the floor", "Stand tall and squeeze the glute — use a wall for support at first"]),
(None, "Bottoms-Up KB Press", "vpush control prehab shoulders", "kb", "", 2, "5/s",
 ["Hold the bell upside down, squeeze the handle hard", "Press slowly overhead keeping it balanced", "Lighter than you think — it's a stability drill"]),
(None, "Half Get-Up", "core control shoulders", "kb|db|", "", 1, "3/s",
 ["Turkish get-up to the tall-sit position only", "Elbow, then hand, eyes on the bell", "Reverse slowly — learn this before the full get-up"]),
(None, "Front Rack Walk", "carry core control", "kb|db", "", 1, "20m/s",
 ["Bell in the rack, tucked against the collarbone", "Walk slow, heel to toe, ribs down", "Don't lean away from the bell"]),
(None, "Overhead Carry", "carry core control shoulders", "kb|db", "", 2, "20m/s",
 ["Lock the bell out overhead, bicep by the ear", "Walk tall and slow, ribs stacked over hips", "Stop if the elbow starts to bend"]),
(None, "Slow High-Knee March", "control core hips prep", "|kb", "", 1, "6/s",
 ["March in place, knee to hip height", "Pause 2 seconds at the top on one leg", "Stand tall — add a bell in the rack or overhead to progress"]),
(None, "Single-Leg Balance Reach", "control single ankles prep", "", "", 1, "5/s",
 ["Balance on one leg, slight knee bend", "Reach the other foot forward, side and back like a clock", "Foot stays rooted, hips level"]),
(None, "Kettlebell Clean & Press", "vpush power hinge cond", "kb", "", 2, "5/s",
 ["Clean the bell to the rack", "Brace and press overhead, lock out", "Lower to the rack, then back between the legs"]),

# ---------------- ATHLETIC / PLYO (added) ----------------
(None, "A-Skip", "prep power", "", "", 1, "20m",
 ["Skip with an exaggerated knee drive", "Strike the ground under your hips", "Opposite arm drives — stay tall"]),
(None, "Pogo Hops", "power prep calves ankles", "", "", 1, "20",
 ["Small, fast bounces off the balls of the feet", "Knees nearly straight — the ankles do the work", "Spend as little time on the ground as possible"]),
("Front_Cone_Hops_or_hurdle_hops", "Hurdle Hops", "power", "", "", 2, "5",
 ["Jump over a low cone or line, feet together", "Land softly and rebound straight away", "Arms drive the jump"]),
("Alternate_Leg_Diagonal_Bound", "Diagonal Bounds", "power lateral single", "", "", 2, "4/s",
 ["Bound forward and across onto one leg", "Stick the landing for a beat", "Push off and go to the other side"]),
("Frog_Hops", "Frog Hops", "power squat", "", "", 2, "5",
 ["Wide squat, hands between the feet", "Jump forward, land back in the squat", "Reset briefly between reps"]),
(None, "Lateral Shuffle", "cond lateral prep", "", "", 1, "20s",
 ["Athletic stance, hips low", "Quick small shuffles — don't cross the feet", "Change direction every few steps"]),
(None, "Shuttle Run", "cond lateral", "", "", 1, "30s",
 ["Two markers about 10m apart", "Sprint, touch the line, turn and go", "Low hips on the turn"]),
("Standing_Cable_Wood_Chop", "Cable / Band Woodchop", "core power", "cable|band", "", 1, "8/s",
 ["Anchor high, feet wide", "Rotate through the hips and chop down across the body", "Arms stay long — power comes from the trunk"]),

# ---------------- STRETCHES & DOWN-REGULATION (added) ----------------
(None, "Bretzel Stretch", "stretch tspine quads hips", "", "", 2, "60s/s",
 ["Lie on your side, top knee bent at 90° on the floor", "Top hand grabs the bottom ankle behind you", "Exhale and let both shoulders drop towards the mat"]),
(None, "Frog Stretch", "stretch groin hips", "", "", 1, "45s",
 ["On all fours, slide the knees wide", "Ankles in line with the knees", "Rock the hips back gently, breathe"]),
(None, "Lizard Stretch", "stretch hips groin", "", "", 1, "45s/s",
 ["Long lunge, both hands inside the front foot", "Let the hips sink", "Drop to the forearms for more"]),
(None, "Puppy Pose", "stretch tspine lats shoulders", "", "", 1, "45s",
 ["Kneel, walk the hands far forward", "Hips over the knees, chest melts to the floor", "Breathe into the upper back"]),
(None, "Supine Twist", "stretch back tspine glutes", "", "", 1, "40s/s",
 ["On your back, drop both knees to one side", "Arms out, look the other way", "Let gravity do the work"]),
(None, "Weighted Straddle Fold", "stretch groin hams", "|kb", "", 1, "90s",
 ["Sit wide-legged, bell on the floor in front of you", "Hold the bell as an anchor and pull the chest forward", "Flat back — hinge from the hips, don't round"]),
(None, "Crocodile Breathing", "breath stretch back", "", "", 1, "90s",
 ["Lie face down, forehead on your hands", "Breathe into your belly so it pushes into the floor", "Slow: 4s in, 6s out"]),
(None, "90/90 Box Breathing", "breath stretch back hips", "", "", 1, "120s",
 ["On your back, feet on a wall or box, knees at 90°", "Breathe 4s in, hold 4, 4s out, hold 4", "Let the low back and shoulders melt down"]),
(None, "Legs Up the Wall", "breath stretch hams", "", "", 1, "120s",
 ["Lie with your hips near a wall, legs straight up it", "Arms relaxed, eyes closed", "Long slow exhales — down-regulate"]),
]

# ---------------- STANDARD GYM: machines, cables, isolation (added) ----------------
X += [
# legs
("Leg_Press", "Leg Press", "squat quads glutes", "machine", "", 1, "10",
 ["Feet shoulder-width, mid-platform", "Lower until knees reach ~90°, low back stays down", "Press through the whole foot, don't lock the knees hard"]),
("Hack_Squat", "Hack Squat", "squat quads", "machine", "", 2, "8",
 ["Shoulders under the pads, feet mid-platform", "Sink deep with control", "Drive up without the knees caving"]),
("Smith_Machine_Squat", "Smith Machine Squat", "squat quads glutes", "machine", "", 1, "8",
 ["Feet slightly in front of the bar", "Sit down between the heels", "Brace and stand tall"]),
("Leg_Extensions", "Leg Extension", "iso quads", "machine", "", 1, "12",
 ["Pad on the lower shin, knee lined up with the pivot", "Straighten fully and squeeze the quads", "Lower slowly — 2–3 seconds"]),
("Lying_Leg_Curls", "Lying Leg Curl", "iso hams", "machine", "", 1, "12",
 ["Hips pressed into the pad", "Curl heels to glutes", "Slow on the way down"]),
("Seated_Leg_Curl", "Seated Leg Curl", "iso hams", "machine", "", 1, "12",
 ["Thigh pad snug, knee at the pivot", "Pull heels under the seat", "Control the return"]),
("Sumo_Deadlift", "Sumo Deadlift", "hinge glutes groin", "bb", "", 2, "5",
 ["Wide stance, toes out, hands inside the knees", "Push the floor apart, chest up", "Hips and shoulders rise together"]),
("Good_Morning", "Good Morning", "hinge hams back", "bb", "", 2, "8",
 ["Bar on upper back, soft knees", "Push hips back with a flat back", "Stop when hamstrings are stretched, stand up"]),
("Bodyweight_Walking_Lunge", "Walking Lunge", "single squat glutes", "|db|kb", "", 1, "10/s",
 ["Long step, back knee kisses the floor", "Front shin fairly vertical", "Drive through the front heel into the next step"]),
("Glute_Ham_Raise", "Glute-Ham Raise", "hinge hams", "machine", "", 3, "6",
 ["Knees just behind the pad, feet locked in", "Lower with a straight line from knee to head", "Curl yourself back up with the hamstrings"]),
("Hyperextensions_Back_Extensions", "Back Extension", "hinge back glutes", "machine", "", 1, "12",
 ["Pad at the hip crease", "Lower with a flat back", "Rise to a straight line — don't over-arch"]),
("Thigh_Abductor", "Hip Abduction Machine", "iso glutes hips", "machine", "", 1, "15",
 ["Sit tall, lean slightly forward for more glute", "Push the knees out", "Slow return"]),
("Thigh_Adductor", "Hip Adduction Machine", "iso groin", "machine", "", 1, "15",
 ["Sit tall, pads on the inner knees", "Squeeze the legs together", "Control the stretch on the way out"]),
("One-Legged_Cable_Kickback", "Cable Glute Kickback", "iso glutes", "cable", "", 1, "12/s",
 ["Ankle strap on, hold the frame", "Kick back and slightly up from the hip", "No low-back arching"]),
("Standing_Calf_Raises", "Standing Calf Raise Machine", "iso calves ankles", "machine", "", 1, "12",
 ["Balls of the feet on the edge", "Full stretch at the bottom, pause", "Rise high onto the big toe"]),
("Seated_Calf_Raise", "Seated Calf Raise", "iso calves", "machine", "", 1, "15",
 ["Pad on the lower thighs", "Deep stretch, pause", "Rise up and squeeze"]),
# chest
("Barbell_Incline_Bench_Press_-_Medium_Grip", "Incline Bench Press", "hpush chest shoulders", "bb", "bench", 2, "8",
 ["Bench at ~30°, shoulder blades pinned", "Lower to the upper chest", "Press up and slightly back"]),
("Incline_Dumbbell_Press", "Incline Dumbbell Press", "hpush chest shoulders", "db", "bench", 1, "10",
 ["Bench at ~30°", "Lower the bells to the sides of the chest", "Press up, bells come together"]),
("Machine_Bench_Press", "Chest Press Machine", "hpush chest", "machine", "", 1, "10",
 ["Handles at mid-chest height", "Press out without shrugging", "Slow return to a good stretch"]),
("Smith_Machine_Bench_Press", "Smith Machine Bench Press", "hpush chest", "machine", "bench", 1, "8",
 ["Bar over the lower chest", "Elbows ~45° from the body", "Press up smoothly"]),
("Butterfly", "Pec Deck", "iso chest", "machine", "", 1, "12",
 ["Elbows soft, chest up", "Bring the pads together in an arc", "Open slowly to a stretch"]),
("Cable_Crossover", "Cable Fly", "iso chest", "cable", "", 1, "12",
 ["Step forward, slight lean", "Hug a big tree — hands meet in front", "Control the stretch back"]),
("Dumbbell_Flyes", "Dumbbell Fly", "iso chest", "db", "bench", 1, "12",
 ["Slight bend in the elbows, locked in", "Open wide to a chest stretch", "Squeeze back together"]),
("Dips_-_Chest_Version", "Dips", "hpush chest triceps", "machine|bar", "", 2, "8",
 ["Lean slightly forward for chest", "Lower until shoulders are just below elbows", "Press up to straight arms"]),
# back
("Close-Grip_Front_Lat_Pulldown", "Close-Grip Pulldown", "vpull lats", "cable", "", 1, "10",
 ["Narrow grip, chest up", "Pull the handle to the upper chest", "Full stretch at the top"]),
("Straight-Arm_Pulldown", "Straight-Arm Pulldown", "iso lats", "cable", "", 1, "12",
 ["Arms long, slight hinge", "Sweep the bar to the thighs", "Feel the lats, not the triceps"]),
("T-Bar_Row_with_Handle", "T-Bar Row", "hpull back lats", "bb", "", 2, "8",
 ["Hinge to ~45°, flat back", "Row the handle to the chest", "Lower under control"]),
("Leverage_Iso_Row", "Machine Row", "hpull back", "machine", "", 1, "10",
 ["Chest on the pad", "Pull elbows back, squeeze the shoulder blades", "Slow return"]),
("Leverage_High_Row", "High Row Machine", "vpull hpull lats back", "machine", "", 1, "10",
 ["Sit tall, chest on the pad", "Drive the elbows down and back", "Control the stretch up"]),
("Dumbbell_Incline_Row", "Chest-Supported Incline Row", "hpull back", "db", "bench", 1, "10",
 ["Chest on an incline bench", "Row both bells to the hips", "Pause and squeeze"]),
("Weighted_Pull_Ups", "Weighted Pull-Up", "vpull lats", "bar", "", 3, "5",
 ["Belt or bell between the knees", "Full hang to chin over bar", "No kipping"]),
# shoulders
("Machine_Shoulder_Military_Press", "Shoulder Press Machine", "vpush shoulders", "machine", "", 1, "10",
 ["Handles at shoulder height", "Press overhead without arching", "Lower to the start"]),
("Arnold_Dumbbell_Press", "Arnold Press", "vpush shoulders", "db", "", 2, "10",
 ["Start palms facing you at the chin", "Rotate out as you press up", "Reverse on the way down"]),
("Side_Lateral_Raise", "Lateral Raise", "iso shoulders", "db|cable|band", "", 1, "12",
 ["Slight lean forward, soft elbows", "Raise out to shoulder height, lead with the elbows", "Lower slowly"]),
("Front_Dumbbell_Raise", "Front Raise", "iso shoulders", "db|kb|band", "", 1, "12",
 ["Arms nearly straight", "Raise to eye level", "No swinging"]),
("Reverse_Machine_Flyes", "Rear Delt Fly", "iso prehab shoulders back", "machine|db|cable", "", 1, "15",
 ["Face the pad, arms long", "Sweep the arms back in an arc", "Squeeze the rear shoulders"]),
("Upright_Barbell_Row", "Upright Row", "iso shoulders", "bb|db|cable", "", 2, "10",
 ["Hands shoulder-width or wider", "Pull elbows up to shoulder height — no higher", "Stop if the shoulders pinch"]),
("Dumbbell_Shrug", "Shrugs", "iso back shoulders", "db|bb", "", 1, "12",
 ["Arms long, stand tall", "Shrug straight up to the ears", "Pause, lower slowly"]),
# arms
("Barbell_Curl", "Barbell Curl", "arms iso biceps", "bb", "", 1, "10",
 ["Elbows pinned to the sides", "Curl without swinging", "Lower all the way down"]),
("Dumbbell_Bicep_Curl", "Dumbbell Curl", "arms iso biceps", "db|kb", "", 1, "10",
 ["Palms forward, elbows still", "Curl and squeeze at the top", "Slow negative"]),
("Hammer_Curls", "Hammer Curl", "arms iso biceps", "db|kb", "", 1, "10",
 ["Palms facing each other", "Curl without swinging", "Control down"]),
("Preacher_Curl", "Preacher Curl", "arms iso biceps", "bb|db|machine", "bench", 1, "10",
 ["Armpits snug on the pad", "Curl up, don't lift the elbows", "Lower to nearly straight"]),
("Standing_Biceps_Cable_Curl", "Cable Curl", "arms iso biceps", "cable|band", "", 1, "12",
 ["Elbows at your sides", "Curl the bar up", "Constant tension — slow down"]),
("Concentration_Curls", "Concentration Curl", "arms iso biceps", "db", "", 1, "10/s",
 ["Elbow braced on the inner thigh", "Curl to the shoulder, squeeze", "Slow lower"]),
("Triceps_Pushdown_-_Rope_Attachment", "Triceps Pushdown", "arms iso triceps", "cable|band", "", 1, "12",
 ["Elbows pinned at your sides", "Push down and spread the rope at the bottom", "Let it rise to 90° only"]),
("Cable_Rope_Overhead_Triceps_Extension", "Overhead Triceps Extension", "arms iso triceps", "cable|db|band", "", 1, "12",
 ["Face away, rope behind the head", "Extend the arms forward and up", "Feel the stretch on the way back"]),
("EZ-Bar_Skullcrusher", "Skull Crusher", "arms iso triceps", "bb|db", "bench", 2, "10",
 ["Upper arms vertical", "Lower to the forehead, elbows in", "Extend to straight arms"]),
("Close-Grip_Barbell_Bench_Press", "Close-Grip Bench Press", "hpush arms triceps chest", "bb", "bench", 2, "8",
 ["Hands shoulder-width", "Elbows tucked as you lower", "Press up with the triceps"]),
("Bench_Dips", "Bench Dips", "arms triceps", "", "bench", 1, "12",
 ["Hands on a bench behind you", "Lower until elbows are ~90°", "Press back up"]),
# core
("Cable_Crunch", "Cable Crunch", "core", "cable", "", 1, "12",
 ["Kneel, rope by the head", "Curl the ribs to the hips", "Hips stay still"]),
("Ab_Crunch_Machine", "Ab Crunch Machine", "core", "machine", "", 1, "12",
 ["Set the seat so the pads sit on your chest", "Crunch down with the abs", "Slow return"]),
# cardio machines
("Walking_Treadmill", "Incline Treadmill Walk", "cond", "cardio", "", 1, "600s",
 ["Incline 8–12%, brisk pace", "Don't hold the rails", "Conversational effort"]),
("Stairmaster", "Stair Climber", "cond", "cardio", "", 1, "300s",
 ["Steady pace, stand tall", "Light hands on the rails", "Whole foot on each step"]),
("Elliptical_Trainer", "Elliptical", "cond", "cardio", "", 1, "600s",
 ["Smooth strides, push and pull the handles", "Moderate resistance", "Easy on the joints"]),
("Bicycling_Stationary", "Stationary Bike", "cond", "cardio", "", 1, "600s",
 ["Seat at hip height", "Steady cadence 80–90 rpm", "Add intervals for conditioning"]),
]

# ---------------- DESK & BEDTIME (added) ----------------
X += [
(None, "Standing Hip Flexor Stretch", "stretch hips quads", "", "", 1, "30s/s",
 ["Split stance, back heel up", "Tuck the pelvis under and squeeze the back glute", "Reach the same-side arm up for more"]),
(None, "Chin Tucks", "prep mobility neck", "", "", 1, "10",
 ["Sit or stand tall", "Glide the head straight back — make a double chin", "Hold 2 seconds, release"]),
(None, "Standing T-Spine Rotation", "prep mobility tspine", "", "", 1, "8/s",
 ["Hips square, hands crossed on the chest or at the ears", "Rotate from the upper back, not the hips", "Breathe out as you turn"]),
(None, "Chair Thoracic Extension", "prep mobility tspine", "", "", 1, "8",
 ["Sit tall, hands behind the head", "Lean back over the top of the chair", "Lift the chest to the ceiling, then return"]),
(None, "Seated Figure-4 Stretch", "stretch glutes hips", "", "", 1, "30s/s",
 ["Sit on a chair, ankle over the opposite knee", "Long spine, hinge forward slightly", "Feel it in the outer hip"]),
(None, "Neck Side Stretch", "stretch neck shoulders", "", "", 1, "30s/s",
 ["Sit tall, ear towards shoulder", "Let the opposite shoulder drop", "Gentle — no pulling"]),
(None, "Supine Figure-4 Stretch", "stretch glutes hips", "", "", 1, "60s/s",
 ["On your back, ankle over the opposite knee", "Pull the bottom thigh towards you", "Head and shoulders stay relaxed on the floor"]),
(None, "Happy Baby", "stretch groin hips back", "", "", 1, "60s",
 ["On your back, grab the outside of the feet", "Knees towards the armpits", "Rock gently side to side"]),
(None, "Reclined Butterfly", "stretch groin hips", "", "", 1, "90s",
 ["Lie back, soles of the feet together", "Let the knees fall open — pillows under them if needed", "Hands on the belly, slow breaths"]),
]

X.append(("Standing_Dumbbell_Calf_Raise", "Calf Raise", "prehab calves ankles", "|db|kb", "", 1, "15",
 ["Rise up onto the big toe", "Pause at the top, slow lower", "Do them on a step for more range"]))


def slug(s):
    s = s.lower().replace("'", "").replace("—", "-").replace("–", "-").replace("&", "and").replace("/", "-")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def fetch(url, dest):
    tmp = dest + ".dl"
    urllib.request.urlretrieve(url, tmp)
    # resize to 560px, convert to greyscale for a uniform look, compress
    subprocess.run(["sips", "-Z", "560", "-m", "/System/Library/ColorSync/Profiles/Generic Gray Profile.icc",
                    "-s", "format", "jpeg", "-s", "formatOptions", "62", tmp, "--out", dest],
                   check=True, capture_output=True)
    os.remove(tmp)


def main():
    force = "--force" in sys.argv
    src_path = os.path.join(os.path.dirname(__file__), ".cache_exercises.json")
    if not os.path.exists(src_path):
        urllib.request.urlretrieve(RAW + "dist/exercises.json", src_path)
    db = {e["id"]: e for e in json.load(open(src_path))}
    os.makedirs(IMG_DIR, exist_ok=True)

    out, seen = [], set()
    for row in X:
        src, name, tags, eq, req, tier, dose, cues = row[:8]
        steps = row[8] if len(row) > 8 else None
        sid = slug(name)
        assert sid not in seen, sid
        seen.add(sid)
        e = db.get(src) if src else None
        if src and not e:
            raise SystemExit(f"missing source id {src}")
        imgs = []
        custom = [os.path.join(ROOT, "img", "custom", f"{sid}-{i}.jpg") for i in (0, 1)]
        if any(os.path.exists(c) for c in custom):
            # your own photos override the database ones (same greyscale treatment)
            for i, c in enumerate(custom):
                if not os.path.exists(c):
                    continue
                dest = os.path.join(IMG_DIR, f"{sid}-{i}.jpg")
                if force or not os.path.exists(dest) or os.path.getmtime(c) > os.path.getmtime(dest):
                    print("  custom", sid, i)
                    subprocess.run(["sips", "-Z", "560", "-m", "/System/Library/ColorSync/Profiles/Generic Gray Profile.icc",
                                    "-s", "format", "jpeg", "-s", "formatOptions", "62", c, "--out", dest], check=True, capture_output=True)
                imgs.append(f"img/ex/{sid}-{i}.jpg")
        elif e:
            for i, p in enumerate(e["images"][:2]):
                dest = os.path.join(IMG_DIR, f"{sid}-{i}.jpg")
                if force or not os.path.exists(dest):
                    print("  fetch", sid, i)
                    fetch(RAW + "exercises/" + p, dest)
                imgs.append(f"img/ex/{sid}-{i}.jpg")
        item = {
            "id": sid, "name": name, "tags": tags.split(),
            "eq": [q or "bw" for q in eq.split("|")] if eq else ["bw"],
            "req": req.split(), "tier": tier, "dose": dose, "cues": cues,
            "steps": steps or (e["instructions"] if e else []),
            "muscles": (e["primaryMuscles"] + e["secondaryMuscles"]) if e else [],
            "img": imgs,
        }
        out.append(item)

    js = "// Generated by tools/build_data.py — do not edit by hand.\n" \
         "// Photos & base instructions: free-exercise-db (Unlicense / public domain).\n" \
         "window.EXERCISES = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n"
    open(os.path.join(ROOT, "js", "data.js"), "w").write(js)
    print(f"wrote {len(out)} exercises, {sum(len(o['img']) for o in out)} images")


if __name__ == "__main__":
    main()
