import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type {
  ImprovedResume,
  ImprovedResumeBullet,
  ImprovedResumeEntry,
} from "@/app/lib/groq";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 32,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Times-Roman",
    color: "#000000",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  name: {
    fontFamily: "Times-Bold",
    fontSize: 20,
  },
  website: {
    fontSize: 9,
    marginTop: 2,
  },
  contactRight: {
    fontSize: 9,
    textAlign: "right",
  },
  section: {
    marginTop: 10,
  },
  heading: {
    marginBottom: 4,
    paddingBottom: 1,
    borderBottom: "1 solid #000000",
  },
  headingFirstLetter: {
    fontFamily: "Times-Bold",
    fontSize: 11,
  },
  headingRest: {
    fontFamily: "Times-Bold",
    fontSize: 9,
  },
  entryBlock: {
    flexDirection: "row",
    marginBottom: 4,
  },
  entryBulletCol: {
    width: 10,
    fontSize: 10,
  },
  entryContent: {
    flex: 1,
  },
  entryTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  entryTitle: {
    fontFamily: "Times-Bold",
    fontSize: 10,
  },
  entryLocation: {
    fontSize: 10,
  },
  entrySubtitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  entrySubtitle: {
    fontFamily: "Times-Italic",
    fontSize: 10,
  },
  entryDates: {
    fontFamily: "Times-Italic",
    fontSize: 10,
  },
  nestedBulletRow: {
    flexDirection: "row",
    marginTop: 2,
    paddingLeft: 4,
  },
  nestedBulletMarker: {
    width: 10,
    fontSize: 9,
  },
  flatBulletRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  flatBulletMarker: {
    width: 10,
    fontSize: 10,
  },
  bulletTextWrap: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.3,
  },
  bulletLead: {
    fontFamily: "Times-Bold",
  },
});

function SmallCapsHeading({ text }: { text: string }) {
  const words = text.toUpperCase().split(" ");
  return (
    <Text style={styles.heading}>
      {words.map((word, index) => (
        <Text key={index}>
          {index > 0 ? " " : ""}
          <Text style={styles.headingFirstLetter}>{word.charAt(0)}</Text>
          <Text style={styles.headingRest}>{word.slice(1)}</Text>
        </Text>
      ))}
    </Text>
  );
}

function EntryBullets({
  bullets,
  nested,
}: {
  bullets: ImprovedResumeBullet[];
  nested: boolean;
}) {
  return (
    <>
      {bullets.map((bullet, index) => (
        <View
          key={index}
          style={nested ? styles.nestedBulletRow : styles.flatBulletRow}
        >
          <Text
            style={nested ? styles.nestedBulletMarker : styles.flatBulletMarker}
          >
            {nested ? "-" : "•"}
          </Text>
          <Text style={styles.bulletTextWrap}>
            {bullet.lead && (
              <Text style={styles.bulletLead}>{bullet.lead}: </Text>
            )}
            {bullet.text}
          </Text>
        </View>
      ))}
    </>
  );
}

function Entry({ entry }: { entry: ImprovedResumeEntry }) {
  if (!entry.title) {
    return <EntryBullets bullets={entry.bullets} nested={false} />;
  }

  return (
    <View style={styles.entryBlock}>
      <Text style={styles.entryBulletCol}>{"•"}</Text>
      <View style={styles.entryContent}>
        <View style={styles.entryTitleRow}>
          <Text style={styles.entryTitle}>{entry.title}</Text>
          {entry.location && (
            <Text style={styles.entryLocation}>{entry.location}</Text>
          )}
        </View>
        {(entry.subtitle || entry.dates) && (
          <View style={styles.entrySubtitleRow}>
            <Text style={styles.entrySubtitle}>{entry.subtitle}</Text>
            {entry.dates && (
              <Text style={styles.entryDates}>{entry.dates}</Text>
            )}
          </View>
        )}
        <EntryBullets bullets={entry.bullets} nested={true} />
      </View>
    </View>
  );
}

export function ImprovedResumeDocument({
  resume,
}: {
  resume: ImprovedResume;
}) {
  const contactRight = [
    resume.contact?.email,
    resume.contact?.phone,
    resume.contact?.location,
  ].filter((value): value is string => Boolean(value));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.name}>{resume.name}</Text>
            {resume.contact?.website && (
              <Text style={styles.website}>{resume.contact.website}</Text>
            )}
          </View>
          {contactRight.length > 0 && (
            <View>
              {contactRight.map((line, index) => (
                <Text key={index} style={styles.contactRight}>
                  {line}
                </Text>
              ))}
            </View>
          )}
        </View>
        {resume.sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <SmallCapsHeading text={section.heading} />
            {section.entries.map((entry, entryIndex) => (
              <Entry key={entryIndex} entry={entry} />
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
