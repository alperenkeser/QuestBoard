import questBoardIcon from "../../assets/questboard-icon.png";

interface QuestBoardIconProps {
  className?: string;
}

export function QuestBoardIcon({ className = "" }: QuestBoardIconProps): JSX.Element {
  return <img src={questBoardIcon} className={className} alt="" aria-hidden="true" />;
}
