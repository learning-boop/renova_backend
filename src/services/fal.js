const { fal } = require('@fal-ai/client');

// Configure fal client with API key
fal.config({ credentials: process.env.FAL_KEY });

// Treatment-specific prompt modifiers
const TREATMENT_PROMPTS = {
  'smooth-lines':
    'natural skin texture with softened expression lines, smooth forehead, relaxed eye area, refreshed appearance',
  'face-sculpt':
    'defined cheekbones, sculpted jawline, balanced facial proportions, subtle volume enhancement',
  'skin-glow':
    'radiant glowing skin, even skin tone, bright complexion, healthy luminous appearance',
  'collagen-restore':
    'firm lifted skin, improved skin texture, youthful plumpness, reduced laxity',
  'clear-skin':
    'clear smooth skin, even pigmentation, refined pores, blemish-free complexion',
  'neck-renewal':
    'smooth neck, tightened skin, refined décolletage, youthful neck contour',
  'full-face-refresh':
    'refreshed rejuvenated face, natural enhancement, well-rested appearance, balanced features',
  'stay-youthful':
    'youthful fresh appearance, preventative enhancement, natural subtle improvement',
};

/**
 * Generate a treatment preview image using fal.ai
 * @param {string} imageUrl - URL or base64 of the client's uploaded photo
 * @param {string} treatment - Treatment slug
 * @returns {object} - { resultUrl, falRequestId }
 */
async function generateTreatmentPreview(imageUrl, treatment) {
  const treatmentModifier =
    TREATMENT_PROMPTS[treatment] ||
    'natural aesthetic enhancement, refreshed appearance';

  const prompt = `Professional portrait photo of a person after a non-surgical aesthetic treatment, ${treatmentModifier}, photorealistic, high quality, natural lighting, before and after style`;

  const result = await fal.subscribe('fal-ai/flux/dev', {
    input: {
      prompt,
      image_url: imageUrl,
      num_inference_steps: 28,
      strength: 0.65,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: true,
    },
    logs: false,
  });

  const resultUrl = result.data?.images?.[0]?.url;
  if (!resultUrl) throw new Error('No image returned from fal.ai');

  return {
    resultUrl,
    falRequestId: result.requestId,
  };
}

module.exports = { generateTreatmentPreview };
