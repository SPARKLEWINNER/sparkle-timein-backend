exports.userSignupValidator = (req, res, next) => {
    req.check("name", "Name must be filled").notEmpty();
    req.check("email", "Email must be 4 to 32 characters long")
        .matches(/.+\@.+\..+/)
        .withMessage("Email must contain @")
        .isLength({
            min: 4,
            max: 64
        });
    req.check("password", "Password is required").notEmpty();
    req.check("password")
        .isLength({ min: 6 })
        .withMessage("The password must contain at least 6 characters")
        .matches(/\d/)
        .withMessage("The password must contain at least one number.");

    const errors = req.validationErrors();
    if (errors) {
        const firstError = errors.map(error => error.msg)[0];
        return res.status(400).json({ error: firstError });
    }
    next();
};
