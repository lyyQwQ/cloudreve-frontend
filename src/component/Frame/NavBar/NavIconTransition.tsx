import { Box, Fade, SvgIconProps } from "@mui/material";
import { TransitionGroup } from "react-transition-group";
import "../../Common/FadeTransition.css";
import { type ComponentType } from "react";

export interface NavIconTransitionProps {
  fileIcon: ComponentType<SvgIconProps>[];
  active?: boolean;
  [key: string]: any;
  iconProps?: SvgIconProps;
}

const NavIconTransition = ({ fileIcon, active, iconProps, ...rest }: NavIconTransitionProps) => {
  const [Active, InActive] = fileIcon;
  return (
    <Box {...rest}>
      <TransitionGroup>
        {active && (
          <Fade key={"active"}>
            <span>
              <Active sx={{ position: "absolute" }} {...iconProps} />
            </span>
          </Fade>
        )}
        {!active && (
          <Fade key={"inactive"}>
            <span>
              <InActive sx={{ position: "absolute" }} key={"inactive"} {...iconProps} />
            </span>
          </Fade>
        )}
        <InActive key={"3"} sx={{ visibility: "hidden" }} {...iconProps} />
      </TransitionGroup>
    </Box>
  );
};

export default NavIconTransition;
