import { Box, ButtonBase, ButtonBaseProps, darken, lighten, styled } from "@mui/material";
import * as React from "react";
import { NoWrapTypography } from "../../Common/StyledComponents.tsx";

const StyledButtonBase = styled(ButtonBase)<{
  active?: boolean;
}>(({ theme, active }) => ({
  borderRadius: "90px",
  display: "flex",
  justifyContent: "left",
  alignItems: "initial",
  width: "100%",
  backgroundColor: active
    ? `${
        theme.palette.mode == "light"
          ? lighten(theme.palette.primary.main, 0.7)
          : darken(theme.palette.primary.main, 0.7)
      }!important`
    : "initial",
  transition:
    "background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,border 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
}));

export interface SideNavItemBaseProps extends ButtonBaseProps {
  active?: boolean;
}
export const SideNavItemBase = React.forwardRef<HTMLButtonElement, SideNavItemBaseProps>(({ active, ...rest }, ref) => {
  return <StyledButtonBase active={active} {...rest} ref={ref} />;
});

const StyledSideNavItem = styled(SideNavItemBase)<{ level?: number }>(({ theme, level }) => ({
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  padding: "4px",
  paddingLeft: `${28 + (level ?? 0) * 16}px`,
  height: "32px",
  display: "flex",
  alignItems: "center",
}));

export interface SideNavItemProps extends SideNavItemBaseProps {
  icon?: React.ReactNode;
  label?: string | React.ReactNode;
  level?: number;
}

const SideNavItem = React.forwardRef<HTMLButtonElement, SideNavItemProps>(
  ({ icon, label, level, sx, ...rest }, ref) => {
    return (
      <StyledSideNavItem level={level} sx={sx} {...rest} ref={ref}>
        <Box
          sx={{
            width: 20,
            mr: "14px",
          }}
        >
          {icon}
        </Box>
        <NoWrapTypography variant={"body2"}>{label}</NoWrapTypography>
      </StyledSideNavItem>
    );
  },
);

export default SideNavItem;
