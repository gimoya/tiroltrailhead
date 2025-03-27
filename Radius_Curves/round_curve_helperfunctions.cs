/// Helper function BF_length
const length = v => Math.sqrt(v.x * v.x + v.y * v.y);
const dot_product = (v1, v2) => v1.x * v2.x + v1.y * v2.y;
const cosine_between = (v1, v2) => dot_product(v1, v2) / (length(v1) * length(v2));

const cos_a = cosine_between(BA, BC);
const tan_half_a = Math.sqrt((1 - cos_a) / (1 + cos_a));
const BF_length = radius / tan_half_a;

/// Helper function vector BF
const unit = v => {
    const l = length(v);
    return { x: v.x / l, y: v.y / l };
};
const scalar_multiply = (v, n) => ({ x: v.x * n, y: v.y * n });

const BF = scalar_multiply(unit(BA), BF_length);

/// Helper function middle point O
const add = (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y });
const rotate_by_90_degrees = (v, sign) => ({ x: -v.y * sign, y: v.x * sign });

const sign = Math.sign(BA.x * BC.y - BA.y * BC.x);
const O = add(F, rotate_by_90_degrees(scalar_multiply(unit(BA), radius), sign));

/* COMMENTARY TO CODE:
Calculate the length of the BF vector:

The length equals to the radius (FO) of your circle (a known value you choose yourself) divided by the tangent of the angle between vectors BF and BO. This is because the triangle made by points B, O and F is a 'right' triangle (the angle between vectors BF and FO is 90 degrees).
The angle between vectors BF and BO is half the angle between vectors BA and BC. This may or may not sound obvious, rest assured it's trivially provable but I omit the proof.
The relationship between the angles is useful because there happens to be a fairly simple equation expressing the relationship between the tangent of an angle and the cosine of twice the angle: Math.tan(a/2) == Math.sqrt((1 - Math.cos(a)) / (1 + Math.cos(a)).
And it so happens that the cosine of the angle between vectors BA and BC (Math.cos(a)) is the dot product of the two vectors divided by the product of their lengths (see definition of vector dot product on Wikipedia).
And so, having calculated the cosine of the angle, you can then calculate the tangent of the half angle, and, subsequently, the length of BF:
(Legend: I model vectors (BA, BC, etc) as objects with properties x and y for their respective coordinates in screen space (X increases to the right, Y downwards); radius is the desired radius of the would-be rounded corner, and BF_length is the length of BF (obviously))

/// Helper function length_BF
/// Code start
const length = v => Math.sqrt(v.x * v.x + v.y * v.y);
const dot_product = (v1, v2) => v1.x * v2.x + v1.y * v2.y;
const cosine_between = (v1, v2) => dot_product(v1, v2) / (length(v1) * length(v2));

const cos_a = cosine_between(BA, BC);
const tan_half_a = Math.sqrt((1 - cos_a) / (1 + cos_a));
const BF_length = radius / tan_half_a;
Compute the BF vector. We know its length now (BF_length above) and since BF lies on the same line the vector BA lies on, the former (and, by implication, the coordinate of the point F relative to point B) is computable by doing a scalar multiplication of the length of BF by the unit vector equivalent of BA:

/// Helper function vector BF
const unit = v => {
    const l = length(v);
    return { x: v.x / l, y: v.y / l };
};
const scalar_multiply = (v, n) => ({ x: v.x * n, y: v.y * n });

const BF = scalar_multiply(unit(BA), BF_length);
/// Code end

Now that you have coordinates of F from the prior step, you calculate the FO vector, or the O coordinate. This is done by rotating some vector of length radius that lies on the same line that the vector BA lies on, both vectors pointing in the same direction, by 90 degrees, and moving it so it starts at F.
Now, whether the rotation is clockwise or counter-clockwise depends on the sign of the angle between the vectors BA and BC, more concretely if the difference between the respective angles (each counted against the same reference, in this case the X axis) of BA and BC is positive then the rotation is counter-clockwise, otherwise it's clockwise.
We don't want to calculate angles if we can avoid it -- it's the sign of the difference we want, after all. Long story short the sign of the angle (sign) can be calculated with the expression Math.sign(BA.x * BC.y - BA.y * BC.x).
Here is computation of coordinates of O (O), with F being the coordinate of well, F:

/// Helper function middle point O
/// Code start
const add = (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y });
const rotate_by_90_degrees = (v, sign) => ({ x: -v.y * sign, y: v.x * sign });

const sign = Math.sign(BA.x * BC.y - BA.y * BC.x);
const O = add(F, rotate_by_90_degrees(scalar_multiply(unit(BA), radius), sign));
/// Code end
That's all -- since you've obtained the point O with coordinates in the same space as those of your original points (A, B and C), you can just put a circle of the used radius with O as its centre.
*/