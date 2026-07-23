import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import customersAuthRouter from "./customers/auth";
import customersMeRouter from "./customers/me";
import lookbooksRouter from "./lookbooks";
import portalAuthRouter from "./portal/auth";
import portalProductsRouter from "./portal/products";
import portalCategoriesRouter from "./portal/categories";
import portalMediaRouter from "./portal/media";
import portalCustomersRouter from "./portal/customers";
import portalOrdersRouter from "./portal/orders";
import portalNotificationsRouter from "./portal/notifications";
import portalStatsRouter from "./portal/stats";
import portalLookbooksRouter from "./portal/lookbooks";
import portalFeedbackRouter from "./portal/feedback";
import paymentsRouter from "./payments";
import { apiNotFoundHandler } from "../middlewares/security";

const router: IRouter = Router();

// Public routes
router.use(healthRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(customersAuthRouter);
router.use(customersMeRouter);
router.use(lookbooksRouter);
router.use(paymentsRouter);


// Admin portal routes
router.use(portalAuthRouter);
router.use(portalStatsRouter);
router.use(portalProductsRouter);
router.use(portalCategoriesRouter);
router.use(portalMediaRouter);
router.use(portalCustomersRouter);
router.use(portalOrdersRouter);
router.use(portalNotificationsRouter);
router.use(portalLookbooksRouter);
router.use(portalFeedbackRouter);

// Catch-all 404 for any unmatched /api/* route
router.use(apiNotFoundHandler);

export default router;
